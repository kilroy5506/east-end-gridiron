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
import draftDataRaw from "@/data/draft.json";
import powerRankingsDataRaw from "@/data/power-rankings.json";
import type {
  DraftData,
  EspnTeam,
  LeagueData,
  PowerRankingsData,
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
const draftData = draftDataRaw as DraftData;
const powerRankingsData = powerRankingsDataRaw as PowerRankingsData;

export function teamName(team: EspnTeam): string {
  const name = `${team.location ?? ""} ${team.nickname ?? ""}`.trim();
  if (name) return name;
  // Some teams never get a custom name set in ESPN and don't return
  // location/nickname at all — the owner's real name is a much more
  // useful fallback than a cryptic 2-4 letter abbreviation.
  const owners = ownerNames(team);
  return owners || team.abbrev || `Team ${team.id}`;
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

export function getDraftData(): DraftData {
  return draftData;
}

export function getPowerRankings(): PowerRankingsData {
  return powerRankingsData;
}

/** Full name(s) of a team's owner(s), or a graceful fallback if ESPN didn't
 *  return member info for this league/view. */
export function ownerNames(team: EspnTeam): string {
  return team.owners && team.owners.length > 0 ? team.owners.join(" & ") : "";
}

/** The league's "bonus win/loss" component alone (an extra win for beating,
 *  or loss for missing, the weekly league-wide average score) — derived as
 *  ESPN's overall record minus this team's real head-to-head record, rather
 *  than recomputed from scratch, so it always matches ESPN's own total
 *  exactly without us having to replicate ESPN's exact averaging rule
 *  (mean vs. median, rounding, etc.). Returns null until `overallRecord`
 *  has synced (see EspnTeam in lib/types.ts). Clamped at 0 as a defensive
 *  floor — the two record halves come from the same API response, so a
 *  negative bonus count would only mean something is actually wrong, not a
 *  real result. */
export function bonusRecord(
  team: EspnTeam
): { wins: number; losses: number; ties: number } | null {
  if (!team.overallRecord) return null;
  return {
    wins: Math.max(0, team.overallRecord.wins - team.record.wins),
    losses: Math.max(0, team.overallRecord.losses - team.record.losses),
    ties: Math.max(0, team.overallRecord.ties - team.record.ties),
  };
}
