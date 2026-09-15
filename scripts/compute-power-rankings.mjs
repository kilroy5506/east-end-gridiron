// Computes the site's Power Rankings using Michael's own multi-year
// methodology (not ESPN's). For every completed week of the season, each
// team gets ranked in five categories, and the sum of those five ranks —
// the "Power Score" — is itself ranked to produce the final order:
//
//   1. Record            — real wins/losses/ties against the actual
//                           weekly opponent.
//   2. Points Scored      — total points scored all season.
//   3. Breakdown          — "all-play" wins: each week, a team is credited
//                           a win for every other team it outscored that
//                           week (a tie counts as half a win), regardless
//                           of who it actually played.
//   4. Coach Rating        — average of each week's (points started) /
//                           (best possible lineup that week), i.e. how much
//                           of the roster's available points the manager's
//                           actual start/sit decisions captured.
//   5. Optimal Breakdown  — the same all-play calculation as Breakdown,
//                           but using each team's *optimal* lineup score
//                           instead of what they actually started, so it
//                           reflects roster strength independent of
//                           start/sit mistakes.
//
// Rank 1 is best in every category (standard competition ranking — ties
// share the better rank, e.g. 1, 2, 2, 4). Lower Power Score is better.
//
// This is intentionally self-contained (its own ESPN fetch helper, not
// shared with fetch-espn-data.mjs) so it can be read and reasoned about on
// its own — it runs far less often and does a very different kind of work
// (season-to-date, week-by-week) than the 15-minutely live sync.

import { writeFile, mkdir } from "node:fs/promises";

// Read lazily (inside main(), not at module load) so this file can be
// imported — e.g. by tests exercising the pure functions below — without
// requiring these env vars or making any network call.
const LEAGUE_ID = process.env.ESPN_LEAGUE_ID;
const SEASON_ID = process.env.ESPN_SEASON_ID;
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

// ESPN's fixed lineup-slot id -> name map (this is stable across leagues,
// not something ESPN exposes directly, but it's been the same for years).
// BENCH and IR are excluded from "starting" slots below regardless of how
// many roster spots a league gives them.
const SLOT_NAMES = {
  0: "QB", 1: "TQB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE", 7: "OP",
  8: "DT", 9: "DE", 10: "LB", 11: "DL", 12: "CB", 13: "S", 14: "DB", 15: "DP",
  16: "D/ST", 17: "K", 18: "P", 19: "HC", 20: "BENCH", 21: "IR", 22: "UNKNOWN",
  23: "FLEX", 24: "ER", 25: "Rookie",
};
const BENCH_SLOTS = new Set([20, 21]);

// --- Optimal-lineup solver -------------------------------------------------
// Classic O(n^3) Hungarian algorithm (rectangular assignment, minimizing
// cost). We want to MAXIMIZE points assigned to a fixed set of starting
// slots, so costs are negated points; ineligible player/slot pairs get a
// large finite penalty (not Infinity, which produces NaN in the algorithm's
// arithmetic). Slots (rows) are padded with zero-cost dummy rows up to the
// number of players (columns) so the matrix is square, which is what this
// formulation of the algorithm requires — the dummy rows just "use up" a
// player without assigning them to a real slot.
const PENALTY = 1_000_000;

export function hungarian(costMatrix) {
  const n = costMatrix.length; // rows (padded to equal columns by the caller)
  const m = costMatrix[0].length; // columns
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0); // p[j] = 1-indexed row currently assigned to column j
  const way = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const rowAssignment = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] !== 0) rowAssignment[p[j] - 1] = j - 1;
  }
  return rowAssignment; // rowAssignment[row] = column index (both 0-indexed), or -1
}

/**
 * players: [{ id, points, eligibleSlots: number[] }]
 * startingSlotIds: number[] — one entry per slot INSTANCE to fill, e.g.
 *   [0, 2, 2, 4, 4, 6, 23, 16, 17] for QB, RB, RB, WR, WR, TE, FLEX, D/ST, K.
 * Returns the maximum total points achievable across all those slots.
 */
export function solveOptimalLineup(players, startingSlotIds) {
  const slotCount = startingSlotIds.length;
  const playerCount = players.length;
  if (slotCount === 0 || playerCount === 0) return 0;

  // Square cost matrix: real slot-rows first, then zero-cost dummy rows.
  const size = Math.max(slotCount, playerCount);
  const cost = [];
  for (let row = 0; row < size; row++) {
    if (row < slotCount) {
      const slotId = startingSlotIds[row];
      cost.push(
        players.map((pl) => (pl.eligibleSlots.includes(slotId) ? -pl.points : PENALTY))
      );
    } else {
      cost.push(new Array(playerCount).fill(0)); // dummy slot row
    }
  }
  // Pad columns too if there are somehow fewer players than slots (shouldn't
  // happen with a full roster, but keeps the matrix square either way).
  for (let row = 0; row < size; row++) {
    while (cost[row].length < size) cost[row].push(0);
  }

  const assignment = hungarian(cost);
  let total = 0;
  let filled = 0;
  for (let row = 0; row < slotCount; row++) {
    const col = assignment[row];
    if (col >= 0 && col < playerCount && cost[row][col] < PENALTY) {
      total += -cost[row][col];
      filled++;
    }
  }
  if (filled < slotCount) {
    console.warn(
      `  ! Optimal lineup solver could only fill ${filled}/${slotCount} slots — roster may be short-handed this week.`
    );
  }
  return Math.round(total * 100) / 100;
}

// --- Ranking helper ---------------------------------------------------------
// Standard competition ranking: ties share the better rank, next rank skips
// (1, 2, 2, 4). `valueFn` should return a number where HIGHER is better.
export function rankDescending(teamIds, valueFn) {
  const sorted = [...teamIds].sort((a, b) => valueFn(b) - valueFn(a));
  const ranks = new Map();
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && roundEq(valueFn(sorted[i]), valueFn(sorted[i - 1]))) {
      ranks.set(sorted[i], ranks.get(sorted[i - 1]));
    } else {
      ranks.set(sorted[i], i + 1);
    }
  }
  return ranks;
}
function roundEq(a, b) {
  return Math.round(a * 1000) === Math.round(b * 1000);
}

async function main() {
  if (!LEAGUE_ID || !SEASON_ID) {
    console.error("Missing ESPN_LEAGUE_ID or ESPN_SEASON_ID environment variables.");
    process.exit(1);
  }

  // The workflow fires TWO scheduled crons each Tuesday (7am and 8am UTC) so
  // that 2am Central is always covered whether Central is on daylight or
  // standard time — GitHub Actions cron is fixed UTC and doesn't know about
  // DST. Only the run that's actually landing at 2am Central should do
  // anything; the other one is expected to no-op. A manual run from the
  // Actions tab (workflow_dispatch) always runs regardless of the clock.
  if (process.env.TRIGGER_EVENT === "schedule") {
    const ctHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );
    if (ctHour !== 2) {
      console.log(
        `Scheduled run fired outside the 2am Central window (currently ${ctHour}:00 CT) — ` +
          "skipping. This is expected for one of the two DST-safe cron entries each week."
      );
      return;
    }
  }

  await mkdir("data", { recursive: true });
  const fetchedAt = new Date().toISOString();

  // --- League settings: current week + starting-lineup slot structure -----
  const leagueParams = new URLSearchParams();
  leagueParams.append("view", "mSettings");
  leagueParams.append("view", "mTeam");
  const leagueRaw = await espnFetch(leagueParams);

  const currentWeek = leagueRaw.status?.currentMatchupPeriod ?? leagueRaw.scoringPeriodId ?? 1;
  const slotCounts = leagueRaw.settings?.rosterSettings?.lineupSlotCounts ?? {};
  const startingSlotIds = [];
  for (const [slotIdStr, count] of Object.entries(slotCounts)) {
    const slotId = Number(slotIdStr);
    if (BENCH_SLOTS.has(slotId)) continue;
    for (let i = 0; i < count; i++) startingSlotIds.push(slotId);
  }
  console.log(
    `Starting lineup (${startingSlotIds.length} spots): ` +
      startingSlotIds.map((id) => SLOT_NAMES[id] ?? `slot ${id}`).join(", ")
  );

  const teamIds = (leagueRaw.teams ?? []).map((t) => t.id);

  // --- Walk every week of the season played so far -------------------------
  // Per-team season totals we're accumulating across weeks.
  const totals = new Map(
    teamIds.map((id) => [
      id,
      { wins: 0, losses: 0, ties: 0, pointsScored: 0, breakdownWins: 0, optimalBreakdownWins: 0, coachRatingSum: 0, weeksCounted: 0 },
    ])
  );

  let weeksIncluded = 0;
  for (let week = 1; week <= currentWeek; week++) {
    console.log(`\nWeek ${week}:`);

    // Full roster + per-player points for this specific week.
    const rosterParams = new URLSearchParams();
    rosterParams.append("view", "mRoster");
    rosterParams.append("view", "mTeam");
    rosterParams.append("scoringPeriodId", String(week));
    const rosterRaw = await espnFetch(rosterParams);

    const actualScores = new Map();
    const optimalScores = new Map();
    let anyDataThisWeek = false;

    for (const team of rosterRaw.teams ?? []) {
      const players = [];
      let actual = 0;
      for (const entry of team.roster?.entries ?? []) {
        const poolEntry = entry.playerPoolEntry;
        const player = poolEntry?.player;
        if (!player) continue;
        const statLine = (player.stats ?? []).find(
          (s) => s.scoringPeriodId === week && s.statSourceId === 0
        );
        const points = statLine?.appliedTotal ?? 0;
        if (statLine) anyDataThisWeek = true;
        players.push({ id: player.id, points, eligibleSlots: player.eligibleSlots ?? [] });
        if (!BENCH_SLOTS.has(entry.lineupSlotId)) actual += points;
      }
      actualScores.set(team.id, Math.round(actual * 100) / 100);
      optimalScores.set(team.id, solveOptimalLineup(players, startingSlotIds));
    }

    if (!anyDataThisWeek) {
      console.log("  No scored stats yet for this week — stopping here (nothing left to include).");
      break;
    }

    // Real matchup pairings, to credit actual Record wins/losses/ties.
    const sbParams = new URLSearchParams();
    sbParams.append("view", "mMatchupScore");
    sbParams.append("view", "mScoreboard");
    sbParams.append("scoringPeriodId", String(week));
    const sbRaw = await espnFetch(sbParams);
    const weekMatchups = (sbRaw.schedule ?? []).filter((m) => m.matchupPeriodId === week);

    for (const m of weekMatchups) {
      const homeId = m.home?.teamId;
      const awayId = m.away?.teamId;
      if (homeId == null || awayId == null) continue; // bye week
      const homeScore = actualScores.get(homeId) ?? 0;
      const awayScore = actualScores.get(awayId) ?? 0;
      const home = totals.get(homeId);
      const away = totals.get(awayId);
      if (!home || !away) continue;
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

    // All-play breakdown (actual and optimal) + points + coach rating.
    for (const teamId of teamIds) {
      const t = totals.get(teamId);
      const actual = actualScores.get(teamId) ?? 0;
      const optimal = optimalScores.get(teamId) ?? 0;
      t.pointsScored += actual;

      let breakdownWins = 0;
      let optimalBreakdownWins = 0;
      for (const otherId of teamIds) {
        if (otherId === teamId) continue;
        const otherActual = actualScores.get(otherId) ?? 0;
        const otherOptimal = optimalScores.get(otherId) ?? 0;
        if (actual > otherActual) breakdownWins += 1;
        else if (actual === otherActual) breakdownWins += 0.5;
        if (optimal > otherOptimal) optimalBreakdownWins += 1;
        else if (optimal === otherOptimal) optimalBreakdownWins += 0.5;
      }
      t.breakdownWins += breakdownWins;
      t.optimalBreakdownWins += optimalBreakdownWins;

      if (optimal > 0) {
        t.coachRatingSum += Math.min(1, actual / optimal);
        t.weeksCounted += 1;
      }
    }

    console.log(
      `  Scored ${rosterRaw.teams?.length ?? 0} teams, ${weekMatchups.length} matchups.`
    );
    weeksIncluded = week;
  }

  if (weeksIncluded === 0) {
    console.log("\nNo completed/in-progress weeks with scored data yet — skipping power-rankings.json write.");
    return;
  }

  // --- Rank each category, sum to Power Score, rank Power Score -----------
  const winPct = new Map(
    teamIds.map((id) => {
      const t = totals.get(id);
      const games = t.wins + t.losses + t.ties;
      return [id, games > 0 ? (t.wins + 0.5 * t.ties) / games : 0];
    })
  );
  const recordRanks = rankDescending(teamIds, (id) => winPct.get(id));
  const pointsRanks = rankDescending(teamIds, (id) => totals.get(id).pointsScored);
  const breakdownRanks = rankDescending(teamIds, (id) => totals.get(id).breakdownWins);
  const coachRatingRanks = rankDescending(teamIds, (id) => {
    const t = totals.get(id);
    return t.weeksCounted > 0 ? t.coachRatingSum / t.weeksCounted : 0;
  });
  const optimalBreakdownRanks = rankDescending(teamIds, (id) => totals.get(id).optimalBreakdownWins);

  const powerScores = new Map(
    teamIds.map((id) => [
      id,
      recordRanks.get(id) + pointsRanks.get(id) + breakdownRanks.get(id) + coachRatingRanks.get(id) + optimalBreakdownRanks.get(id),
    ])
  );
  // Lower Power Score is better, so rank ascending — reuse rankDescending by
  // negating the value.
  const powerRanks = rankDescending(teamIds, (id) => -powerScores.get(id));

  const teams = teamIds.map((id) => {
    const t = totals.get(id);
    return {
      teamId: id,
      record: { wins: t.wins, losses: t.losses, ties: t.ties, rank: recordRanks.get(id) },
      pointsScored: { value: Math.round(t.pointsScored * 100) / 100, rank: pointsRanks.get(id) },
      breakdown: { wins: t.breakdownWins, rank: breakdownRanks.get(id) },
      coachRating: {
        pct: t.weeksCounted > 0 ? Math.round((t.coachRatingSum / t.weeksCounted) * 1000) / 10 : 0,
        rank: coachRatingRanks.get(id),
      },
      optimalBreakdown: { wins: t.optimalBreakdownWins, rank: optimalBreakdownRanks.get(id) },
      powerScore: powerScores.get(id),
      powerRank: powerRanks.get(id),
    };
  });
  teams.sort((a, b) => a.powerRank - b.powerRank);

  await writeFile(
    "data/power-rankings.json",
    JSON.stringify({ fetchedAt, throughWeek: weeksIncluded, teams }, null, 2)
  );
  console.log(`\npower-rankings.json written: through week ${weeksIncluded}, ${teams.length} teams.`);
}

// Guarded so this module can be imported (e.g. by tests) without kicking off
// a real ESPN fetch.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("compute-power-rankings failed:", err);
    process.exit(1);
  });
}
