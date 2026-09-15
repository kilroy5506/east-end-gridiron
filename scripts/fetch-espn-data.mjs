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

function mapTeam(raw, membersById, computedRecord) {
  return {
    id: raw.id,
    abbrev: raw.abbrev,
    location: raw.location,
    nickname: raw.nickname,
    // Our own record, not ESPN's raw `record.overall` — see
    // deriveSeasonRecords() for why.
    record: computedRecord ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 },
    // Full owner name(s), e.g. ["Michael Farris"] — from ESPN's league
    // "members" list, matched by the team's owners (member id) array.
    // Falls back to an empty array if ESPN didn't include member info for
    // whatever view combination was requested.
    owners: (raw.owners ?? [])
      .map((memberId) => membersById.get(memberId))
      .filter((name) => Boolean(name)),
  };
}

// Rebuilds each team's season Wins/Losses/Ties/PF/PA ourselves from the real
// matchup schedule, INSTEAD of trusting ESPN's own per-team
// `record.overall` aggregate. We found that field can already count the
// current (not-yet-played) week as decided — observed 2026-09-15: fetched
// right at the Tuesday rollover to Week 2, before a single Week 2 snap had
// been played, every team's ESPN-reported record.overall was already one
// win/loss ahead of their real Week 1 result (a 1-0 team showing as 2-0,
// pointsFor unchanged from Week 1 the whole time — the "extra" result
// carried zero points, just a phantom win or loss). Deriving the record
// ourselves from `schedule`, restricted to matchupPeriodId < currentWeek
// (i.e. only weeks that are actually behind us), can never pick up a
// not-yet-played current week no matter what ESPN's own aggregate says.
// `schedule` here is expected to already hold entries for every
// matchupPeriodId in the season (ESPN returns the whole thing regardless of
// the scoringPeriodId query param — the per-week filtering happens on our
// side, same as compute-power-rankings.mjs already does for its own
// week-by-week walk).
function deriveSeasonRecords(schedule, currentWeek) {
  const records = new Map();
  const get = (teamId) => {
    if (!records.has(teamId)) {
      records.set(teamId, { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    return records.get(teamId);
  };
  for (const m of schedule ?? []) {
    if (m.matchupPeriodId >= currentWeek) continue; // not actually decided yet
    const homeId = m.home?.teamId;
    const awayId = m.away?.teamId;
    if (homeId == null || awayId == null) continue; // bye week
    const homeScore = m.home?.totalPoints ?? 0;
    const awayScore = m.away?.totalPoints ?? 0;
    const home = get(homeId);
    const away = get(awayId);
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;
    if (homeScore > awayScore) {
      home.wins++;
      away.losses++;
    } else if (awayScore > homeScore) {
      away.wins++;
      home.losses++;
    } else {
      home.ties++;
      away.ties++;
    }
  }
  for (const r of records.values()) {
    r.pointsFor = Math.round(r.pointsFor * 100) / 100;
    r.pointsAgainst = Math.round(r.pointsAgainst * 100) / 100;
  }
  return records;
}

function buildMembersById(leagueRaw) {
  const membersById = new Map();
  for (const m of leagueRaw.members ?? []) {
    // .replace collapses any stray double spaces ESPN sometimes leaves in
    // firstName/lastName (e.g. a trailing space saved in someone's profile).
    const fullName = `${m.firstName ?? ""} ${m.lastName ?? ""}`.replace(/\s+/g, " ").trim();
    membersById.set(m.id, fullName || m.displayName || m.id);
  }
  return membersById;
}

// Synced clock times (Central), five times a day rather than continuously —
// the site is mainly used for league news and Power Rankings, not
// second-by-second score-watching, so this trades a little in-game
// freshness for a lot of headroom against Vercel's Hobby-plan deployment
// limit (every commit here triggers a redeploy). GitHub Actions cron is
// fixed UTC and doesn't shift for daylight saving, so the workflow fires
// TWO scheduled crons per target Central time (covering both possible UTC
// offsets) and this script is what actually decides whether "now" is
// really one of those Central times before doing any real work. A manual
// run from the Actions tab (workflow_dispatch) always runs regardless of
// the clock.
const SYNC_CT_HOURS = new Set([0, 8, 12, 16, 20]); // midnight, 8am, noon, 4pm, 8pm

async function main() {
  if (process.env.TRIGGER_EVENT === "schedule") {
    const rawHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );
    const ctHour = rawHour % 24; // defensive: some ICU builds report midnight as "24"
    if (!SYNC_CT_HOURS.has(ctHour)) {
      console.log(
        `Scheduled run fired outside a sync window (currently ${ctHour}:00 CT) — skipping. ` +
          "This is expected for most of the extra DST-safe cron entries each day."
      );
      return;
    }
  }

  await mkdir("data", { recursive: true });
  const fetchedAt = new Date().toISOString();

  // --- League snapshot: teams, records, current week -----------------
  const leagueParams = new URLSearchParams();
  leagueParams.append("view", "mTeam");
  leagueParams.append("view", "mSettings");
  const leagueRaw = await espnFetch(leagueParams);

  const currentWeek = leagueRaw.status?.currentMatchupPeriod ?? leagueRaw.scoringPeriodId ?? 1;

  // Full-season matchup schedule — fetched once here (before building
  // `teams`, since their record now comes from this) and reused below for
  // "this week's matchups" too, instead of fetching it a second time.
  const sbParams = new URLSearchParams();
  sbParams.append("view", "mMatchupScore");
  sbParams.append("view", "mScoreboard");
  sbParams.append("scoringPeriodId", String(currentWeek));
  const sbRaw = await espnFetch(sbParams);

  const seasonRecords = deriveSeasonRecords(sbRaw.schedule, currentWeek);

  const membersById = buildMembersById(leagueRaw);
  const teams = (leagueRaw.teams ?? []).map((t) =>
    mapTeam(t, membersById, seasonRecords.get(t.id))
  );
  teams.sort(
    (a, b) => b.record.wins - a.record.wins || b.record.pointsFor - a.record.pointsFor
  );
  teams.forEach((t, i) => (t.rank = i + 1));

  // Reception scoring value (statId 53, falling back to 41 — ESPN's two
  // "receptions" stat ids) tells us PPR / Half-PPR / Standard automatically,
  // so this doesn't need to be hand-configured per league.
  const scoringItems = leagueRaw.settings?.scoringSettings?.scoringItems ?? [];
  const receptionPoints =
    scoringItems.find((s) => s.statId === 53)?.points ??
    scoringItems.find((s) => s.statId === 41)?.points ??
    0;
  const scoringFormat =
    receptionPoints >= 1 ? "PPR" : receptionPoints >= 0.5 ? "Half-PPR" : receptionPoints > 0 ? `${receptionPoints} pt/reception` : "Standard";

  await writeFile(
    "data/league.json",
    JSON.stringify(
      {
        fetchedAt,
        leagueName: leagueRaw.settings?.name ?? "East End Gridiron Championship",
        size: leagueRaw.settings?.size ?? teams.length,
        currentWeek,
        seasonId: SEASON_ID,
        scoringFormat,
        pointsPerReception: receptionPoints,
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
  // Reuses the same `sbRaw` fetched above for the season-record derivation
  // — same view/params, no need to fetch it twice.

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

  // --- Transactions (most recent 30, for the ticker) ---------------------
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

  // --- Full draft board (every pick, not just recent activity) -----------
  const draftParams = new URLSearchParams();
  draftParams.append("view", "mDraftDetail");
  const draftRaw = await espnFetch(draftParams);

  const picks = (draftRaw.draftDetail?.picks ?? [])
    .map((p) => ({
      overallPickNumber: p.overallPickNumber,
      round: p.roundId,
      roundPickNumber: p.roundPickNumber,
      teamId: p.teamId,
      playerId: p.playerId,
      keeper: Boolean(p.keeper),
    }))
    .sort((a, b) => a.overallPickNumber - b.overallPickNumber);

  // --- One shared player-name lookup, covering both the transaction feed
  // and the full draft board -------------------------------------------
  const playerIds = [
    ...new Set([
      ...transactions.flatMap((t) => t.items.map((i) => i.playerId)),
      ...picks.map((p) => p.playerId),
    ]),
  ];
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

  await writeFile(
    "data/draft.json",
    JSON.stringify(
      { fetchedAt, seasonId: SEASON_ID, drafted: Boolean(draftRaw.draftDetail?.drafted), picks, playerNames },
      null,
      2
    )
  );
  console.log(`draft.json: ${picks.length} picks`);

  console.log(`Done. Snapshot taken at ${fetchedAt}`);
}

main().catch((err) => {
  console.error("fetch-espn-data failed:", err);
  process.exit(1);
});
