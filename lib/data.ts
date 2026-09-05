// Reads the data snapshots that .github/workflows/fetch-espn-data.yml keeps
// updated, instead of calling ESPN's API live on every page load. See that
// workflow (and scripts/fetch-espn-data.mjs) for how the data gets here.
//
// These are plain JSON imports, bundled at build time — every time the
// scheduled job commits new data, Vercel redeploys and the site picks up
// the fresh snapshot. No network call happens while a visitor is on the
// site, and there's nothing here that needs a try/catch for a flaky
// external API.

import leagueDataRaw from "@/data/league.json";
import scoreboardDataRaw from "@/data/scoreboard.json";
import transactionsDataRaw from "@/data/transactions.json";
import statsDataRaw from "@/data/stats.json";
import type {
  EspnTeam,
  LeagueData,
  ScoreboardData,
  StatsData,
  TransactionsData,
} from "./types";

// Cast rather than let TypeScript infer a type from the JSON's current
// content — see the comment above these types in ./types for why.
const leagueData = leagueDataRaw as LeagueData;
const scoreboardData = scoreboardDataRaw as ScoreboardData;
const transactionsData = transactionsDataRaw as TransactionsData;
const statsData = statsDataRaw as StatsData;

export function teamName(team: EspnTeam): string {
  const name = `${team.location ?? ""} ${team.nickname ?? ""}`.trim();
  return name || team.abbrev || `Team ${team.id}`;
}

export function getLeagueSnapshot(): LeagueData {
  return leagueData;
}

export function getScoreboard(): ScoreboardData {
  return scoreboardData;
}

export function getTransactionsData(): TransactionsData {
  return transactionsData;
}

export function getStatsData(): StatsData {
  return statsData;
}
