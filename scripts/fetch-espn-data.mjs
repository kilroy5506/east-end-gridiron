// Writes the results into data/*.json, which the website reads directly
// instead of calling ESPN on every page load.
//
// IMPORTANT: this uses lm-api-reads.fantasy.espn.com, not fantasy.espn.com.
// The old fantasy.espn.com/apis/v3/... address (still referenced in a lot
// of older blog posts and libraries) silently blocked every request we
// sent it, from every environment we tried — Vercel, GitHub Actions, and
// even a script run locally with a freshly-captured session cookie. We
// found the real, current address by watching what ESPN's own site
// actually calls (via a real browser), and a plain request to it — no
// cookies, no browser — works fine. The league is publicly viewable, so
// ESPN_LEAGUE_ID/ESPN_SEASON_ID are all that's required.

import { writeFile, mkdir } from "node:fs/promises";

const LEAGUE_ID = process.env.ESPN_LEAGUE_ID;
const SEASON_ID = process.env.ESPN_SEASON_ID;

if (!LEAGUE_ID || !SEASON_ID) {
  console.error("Missing ESPN_LEAGUE_ID or ESPN_SEASON_ID environment variables.");
  process.exit(1);
}

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON_ID}/segments/0/leagues/${LEAGUE_ID}`;
const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://fantasy.espn.com/",
};

async function espnFetch(params) {
  const url = `${BASE}?${params.toString()}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  const text = await res.text();
  if (!res.ok || !text) {
    throw new Error(
      `ESPN request failed (${res.status}) for ${url}. Body: ${text.slice(0, 300) || "(empty)"}`
    );
  }
  return JSON.parse(text);
}

function mapTeam(raw) {
  return {
    id: raw.id,
    abbrev: raw.abbrev,
    location: raw.location,
    nickname: raw.nickname,
    record: {
      wins: raw.record?.overall?.wins ?? 0,
      losses: raw.record?.overall?.losses ?? 0,
      ties: raw.record?.overall?.ties ?? 0,
      pointsFor: raw.record?.overall?.pointsFor ?? 0,
      pointsAgainst: raw.record?.overall?.pointsAgainst ?? 0,
    },
  };
}

async function main() {
  await mkdir("data", { recursive: true });
  const fetchedAt = new Date().toISOString();

  // --- League snapshot: teams, records, current week -----------------
  const leagueParams = new URLSearchParams();
  leagueParams.append("view", "mTeam");
  leagueParams.append("view", "mSettings");
  const leagueRaw = await espnFetch(leagueParams);

  const teams = (leagueRaw.teams ?? []).map(mapTeam);
  teams.sort(
    (a, b) => b.record.wins - a.record.wins || b.record.pointsFor - a.record.pointsFor
  );
  teams.forEach((t, i) => (t.rank = i + 1));

  const currentWeek = leagueRaw.status?.currentMatchupPeriod ?? leagueRaw.scoringPeriodId ?? 1;

  await writeFile(
    "data/league.json",
    JSON.stringify(
      {
        fetchedAt,
        leagueName: leagueRaw.settings?.name ?? "East End Gridiron Championship",
        size: leagueRaw.settings?.size ?? teams.length,
        currentWeek,
        seasonId: SEASON_ID,
        teams,
      },
      null,
      2
    )
  );
  console.log(`league.json: ${teams.length} teams, week ${currentWeek}`);

  // --- Roster data: live per-player points, used for both the top-scorers
  // list AND to compute each team's live weekly total ourselves ----------
  // ESPN's matchup/scoreboard endpoint (below) only reports a team's
  // "totalPoints" once the week is officially scored — mid-week it comes
  // back as a flat 0 for everyone, even though real points already exist.
  // Individual player stats, on the other hand, ARE live. So rather than
  // trust ESPN's matchup-level total, we add up each team's own starting
  // lineup (excluding bench/IR slots) from this same roster data.
  const rosterParams = new URLSearchParams();
  rosterParams.append("view", "mRoster");
  rosterParams.append("view", "mTeam");
  rosterParams.append("scoringPeriodId", String(currentWeek));
  const rosterRaw = await espnFetch(rosterParams);

  const BENCH_SLOTS = new Set([20, 21]); // Bench, IR — excluded from live team totals
  const liveTeamTotals = {};
  const leaders = [];
  for (const team of rosterRaw.teams ?? []) {
    let teamTotal = 0;
    for (const entry of team.roster?.entries ?? []) {
      const poolEntry = entry.playerPoolEntry;
      const player = poolEntry?.player;
      if (!player) continue;
      const statLine = (player.stats ?? []).find(
        (s) => s.scoringPeriodId === currentWeek && s.statSourceId === 0
      );
      const points = statLine?.appliedTotal ?? poolEntry?.appliedStatTotal ?? 0;
      leaders.push({
        playerId: player.id,
        playerName: player.fullName ?? `Player #${player.id}`,
        teamId: team.id,
        points,
      });
      if (!BENCH_SLOTS.has(entry.lineupSlotId)) {
        teamTotal += points;
      }
    }
    liveTeamTotals[team.id] = Math.round(teamTotal * 100) / 100;
  }
  leaders.sort((a, b) => b.points - a.points);

  await writeFile(
    "data/stats.json",
    JSON.stringify({ fetchedAt, week: currentWeek, leaders: leaders.slice(0, 10) }, null, 2)
  );
  console.log(`stats.json: ${leaders.length} rostered players considered`);

  // --- This week's matchups -------------------------------------------
  const sbParams = new URLSearchParams();
  sbParams.append("view", "mMatchupScore");
  sbParams.append("view", "mScoreboard");
  sbParams.append("scoringPeriodId", String(currentWeek));
  const sbRaw = await espnFetch(sbParams);

  const matchups = (sbRaw.schedule ?? [])
    .filter((m) => m.matchupPeriodId === currentWeek)
    .map((m) => ({
      id: m.id,
      matchupPeriodId: m.matchupPeriodId,
      home: m.home
        ? {
            teamId: m.home.teamId,
            totalPoints: liveTeamTotals[m.home.teamId] ?? m.home.totalPoints ?? 0,
          }
        : undefined,
      away: m.away
        ? {
            teamId: m.away.teamId,
            totalPoints: liveTeamTotals[m.away.teamId] ?? m.away.totalPoints ?? 0,
          }
        : undefined,
      winner: m.winner,
    }));

  await writeFile(
    "data/scoreboard.json",
    JSON.stringify({ fetchedAt, week: currentWeek, matchups }, null, 2)
  );
  console.log(`scoreboard.json: ${matchups.length} matchups`);

  // --- Transactions, with player names resolved ------------------------
  const txParams = new URLSearchParams();
  txParams.append("view", "mTransactions2");
  const txRaw = await espnFetch(txParams);

  const transactions = (txRaw.transactions ?? [])
    .map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      proposedDate: t.proposedDate,
      teamId: t.teamId,
      items: (t.items ?? []).map((i) => ({ playerId: i.playerId, type: i.type })),
    }))
    .sort((a, b) => (b.proposedDate ?? 0) - (a.proposedDate ?? 0))
    .slice(0, 30);

  const playerIds = [...new Set(transactions.flatMap((t) => t.items.map((i) => i.playerId)))];
  const playerNames = {};
  if (playerIds.length > 0) {
    try {
      const res = await fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON_ID}/players?scoringPeriodId=0&view=players_wl`,
        {
          headers: {
            ...BROWSER_HEADERS,
            "X-Fantasy-Filter": JSON.stringify({ players: { filterIds: { value: playerIds } } }),
          },
        }
      );
      if (res.ok) {
        const players = await res.json();
        for (const p of players) {
          if (p?.id) playerNames[p.id] = p.fullName ?? `Player #${p.id}`;
        }
      }
    } catch (err) {
      console.warn("Player name lookup failed (non-fatal):", err.message);
    }
  }

  await writeFile(
    "data/transactions.json",
    JSON.stringify({ fetchedAt, transactions, playerNames }, null, 2)
  );
  console.log(`transactions.json: ${transactions.length} transactions`);

  console.log(`Done. Snapshot taken at ${fetchedAt}`);
}

main().catch((err) => {
  console.error("fetch-espn-data failed:", err);
  process.exit(1);
});
