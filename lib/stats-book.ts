// Turns the raw weekly history already collected by
// scripts/compute-power-rankings.mjs into the "Stats Book" — a set of fun,
// spot-checkable season records (biggest blowout, closest win, best/worst
// single week, longest streaks, and so on). Nothing here changes what's in
// data/power-rankings.json; it's purely derived at render time from
// `weeklyHistory` and the season snapshot, the same way
// app/rankings/[category]/page.tsx derives its drill-down tables.

import { ownerNames, teamName } from "./data";
import type { LeagueData, PowerRankingsData } from "./types";

export type StatTone = "win" | "loss" | "neutral";

export interface StatBookEntry {
  label: string;
  tone: StatTone;
  teamId: number;
  /** Main formatted value, e.g. "1,757.6", "+53.5", "4 games". */
  value: string;
  /** Optional second line of context, e.g. "Week 4 vs. Sarah Trahern (142.3–88.1)". */
  detail?: string;
}

export interface StatBookSection {
  title: string;
  description?: string;
  entries: StatBookEntry[];
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function maxBy<T>(items: T[], valueOf: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || valueOf(item) > valueOf(best)) return item;
    return best;
  }, undefined);
}

function minBy<T>(items: T[], valueOf: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || valueOf(item) < valueOf(best)) return item;
    return best;
  }, undefined);
}

/** Season Totals only need the league snapshot — no Power Rankings run
 *  required — so this section can show up before the weekly job has ever
 *  run, same as PF/PA on the home standings. */
function buildSeasonTotalsSection(snapshot: LeagueData): StatBookSection | null {
  if (snapshot.teams.length === 0) return null;
  const byPF = [...snapshot.teams].sort((a, b) => b.record.pointsFor - a.record.pointsFor);
  const byPA = [...snapshot.teams].sort((a, b) => b.record.pointsAgainst - a.record.pointsAgainst);
  const mostPF = byPF[0];
  const fewestPF = byPF[byPF.length - 1];
  const mostPA = byPA[0];
  const fewestPA = byPA[byPA.length - 1];

  return {
    title: "Season Totals",
    description: "Points for and against, running all season — from the current standings.",
    entries: [
      { label: "Most Points For", tone: "win", teamId: mostPF.id, value: fmt(mostPF.record.pointsFor) },
      { label: "Fewest Points For", tone: "loss", teamId: fewestPF.id, value: fmt(fewestPF.record.pointsFor) },
      { label: "Fewest Points Against", tone: "win", teamId: fewestPA.id, value: fmt(fewestPA.record.pointsAgainst) },
      { label: "Most Points Against", tone: "loss", teamId: mostPA.id, value: fmt(mostPA.record.pointsAgainst) },
    ],
  };
}

/** Shared shape for the "ceiling / floor / average" pattern used for both
 *  actual and optimal weekly scores. */
function ceilingFloorEntries(
  teamIds: number[],
  weeklyValues: Map<number, { week: number; value: number }[]>,
  labels: { total?: string; ceiling: string; floor: string; average: string },
  totals?: Map<number, number>
): StatBookEntry[] {
  const ceilings = teamIds
    .map((teamId) => {
      const weeks = weeklyValues.get(teamId) ?? [];
      if (weeks.length === 0) return null;
      const best = maxBy(weeks, (w) => w.value)!;
      return { teamId, week: best.week, value: best.value };
    })
    .filter((x): x is { teamId: number; week: number; value: number } => x !== null);
  const floors = teamIds
    .map((teamId) => {
      const weeks = weeklyValues.get(teamId) ?? [];
      if (weeks.length === 0) return null;
      const worst = minBy(weeks, (w) => w.value)!;
      return { teamId, week: worst.week, value: worst.value };
    })
    .filter((x): x is { teamId: number; week: number; value: number } => x !== null);
  const averages = teamIds
    .map((teamId) => {
      const weeks = weeklyValues.get(teamId) ?? [];
      if (weeks.length === 0) return null;
      const avg = weeks.reduce((sum, w) => sum + w.value, 0) / weeks.length;
      return { teamId, value: avg };
    })
    .filter((x): x is { teamId: number; value: number } => x !== null);

  const entries: StatBookEntry[] = [];

  if (labels.total && totals) {
    const totalRows = teamIds
      .map((teamId) => ({ teamId, value: totals.get(teamId) ?? 0 }))
      .filter((x) => x.value > 0 || totals.has(x.teamId));
    const mostTotal = maxBy(totalRows, (x) => x.value);
    const leastTotal = minBy(totalRows, (x) => x.value);
    if (mostTotal) {
      entries.push({ label: `Most ${labels.total}`, tone: "win", teamId: mostTotal.teamId, value: fmt(mostTotal.value) });
    }
    if (leastTotal) {
      entries.push({ label: `Least ${labels.total}`, tone: "loss", teamId: leastTotal.teamId, value: fmt(leastTotal.value) });
    }
  }

  const highestCeiling = maxBy(ceilings, (c) => c.value);
  const lowestCeiling = minBy(ceilings, (c) => c.value);
  if (highestCeiling) {
    entries.push({
      label: `Highest ${labels.ceiling}`,
      tone: "win",
      teamId: highestCeiling.teamId,
      value: fmt(highestCeiling.value),
      detail: `Week ${highestCeiling.week}`,
    });
  }
  if (lowestCeiling) {
    entries.push({
      label: `Lowest ${labels.ceiling}`,
      tone: "loss",
      teamId: lowestCeiling.teamId,
      value: fmt(lowestCeiling.value),
      detail: `Week ${lowestCeiling.week} — this team's own BEST week all season`,
    });
  }

  const highestFloor = maxBy(floors, (f) => f.value);
  const lowestFloor = minBy(floors, (f) => f.value);
  if (highestFloor) {
    entries.push({
      label: `Highest ${labels.floor}`,
      tone: "win",
      teamId: highestFloor.teamId,
      value: fmt(highestFloor.value),
      detail: `Week ${highestFloor.week} — this team's own WORST week all season`,
    });
  }
  if (lowestFloor) {
    entries.push({
      label: `Lowest ${labels.floor}`,
      tone: "loss",
      teamId: lowestFloor.teamId,
      value: fmt(lowestFloor.value),
      detail: `Week ${lowestFloor.week}`,
    });
  }

  const highestAvg = maxBy(averages, (a) => a.value);
  const lowestAvg = minBy(averages, (a) => a.value);
  if (highestAvg) {
    entries.push({ label: `Highest ${labels.average}`, tone: "win", teamId: highestAvg.teamId, value: fmt(highestAvg.value) });
  }
  if (lowestAvg) {
    entries.push({ label: `Lowest ${labels.average}`, tone: "loss", teamId: lowestAvg.teamId, value: fmt(lowestAvg.value) });
  }

  return entries;
}

function buildActualWeeklySection(rankings: PowerRankingsData): StatBookSection | null {
  const weeks = rankings.weeklyHistory ?? [];
  if (weeks.length === 0) return null;
  const teamIds = rankings.teams.map((t) => t.teamId);

  const weeklyValues = new Map<number, { week: number; value: number }[]>();
  for (const teamId of teamIds) weeklyValues.set(teamId, []);
  for (const week of weeks) {
    for (const e of week.pointsScored) {
      weeklyValues.get(e.teamId)?.push({ week: week.week, value: e.value });
    }
  }

  return {
    title: "Actual Weekly Scoring Records",
    description: "Based on what each team actually started, week by week.",
    entries: ceilingFloorEntries(teamIds, weeklyValues, {
      ceiling: "Ceiling (best single week)",
      floor: "Floor (worst single week)",
      average: "Average Weekly Score",
    }),
  };
}

function buildOptimalWeeklySection(rankings: PowerRankingsData): StatBookSection | null {
  const weeks = rankings.weeklyHistory ?? [];
  if (weeks.length === 0) return null;
  const teamIds = rankings.teams.map((t) => t.teamId);

  const weeklyValues = new Map<number, { week: number; value: number }[]>();
  for (const teamId of teamIds) weeklyValues.set(teamId, []);
  for (const week of weeks) {
    for (const e of week.optimalPoints ?? []) {
      weeklyValues.get(e.teamId)?.push({ week: week.week, value: e.value });
    }
  }
  const totals = new Map(rankings.teams.map((t) => [t.teamId, t.optimalPoints?.value ?? 0]));

  return {
    title: `"Optimal Lineup" Weekly Scoring Records`,
    description:
      "What each team would have scored with a perfect start/sit call every week — measures roster strength, independent of coaching decisions.",
    entries: ceilingFloorEntries(
      teamIds,
      weeklyValues,
      { total: "Optimal Total", ceiling: "Ceiling Potential", floor: "Floor Potential", average: "Average Optimal Score" },
      totals
    ),
  };
}

function buildMarginsAndStreaksSection(rankings: PowerRankingsData, snapshot: LeagueData): StatBookSection | null {
  const weeks = rankings.weeklyHistory ?? [];
  if (weeks.length === 0) return null;
  const teamIds = rankings.teams.map((t) => t.teamId);
  const teamsById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const nameOf = (id: number) => {
    const t = teamsById.get(id);
    return t ? teamName(t) : `Team ${id}`;
  };

  // Flatten every team-week's own score (needed to show "142.3–88.1" style
  // matchup lines for the margin records) into a quick week+team lookup.
  const scoreOf = new Map<string, number>();
  for (const week of weeks) {
    for (const e of week.pointsScored) scoreOf.set(`${week.week}:${e.teamId}`, e.value);
  }

  type MarginRow = { teamId: number; week: number; margin: number; opponentTeamId: number | null };
  const marginRows: MarginRow[] = [];
  const lossRows: { teamId: number; week: number; value: number; opponentTeamId: number | null }[] = [];
  const winRows: { teamId: number; week: number; value: number; opponentTeamId: number | null }[] = [];

  for (const week of weeks) {
    for (const r of week.record) {
      if (r.opponentTeamId == null) continue; // bye week
      marginRows.push({ teamId: r.teamId, week: week.week, margin: r.margin, opponentTeamId: r.opponentTeamId });
      const own = scoreOf.get(`${week.week}:${r.teamId}`);
      if (own == null) continue;
      if (r.losses === 1) lossRows.push({ teamId: r.teamId, week: week.week, value: own, opponentTeamId: r.opponentTeamId });
      if (r.wins === 1) winRows.push({ teamId: r.teamId, week: week.week, value: own, opponentTeamId: r.opponentTeamId });
    }
  }

  function matchupDetail(row: { week: number; teamId: number; opponentTeamId: number | null }): string {
    const own = scoreOf.get(`${row.week}:${row.teamId}`);
    const opp = row.opponentTeamId != null ? scoreOf.get(`${row.week}:${row.opponentTeamId}`) : undefined;
    const oppName = row.opponentTeamId != null ? nameOf(row.opponentTeamId) : "a bye";
    if (own != null && opp != null) {
      return `Week ${row.week} vs. ${oppName} (${fmt(own)}–${fmt(opp)})`;
    }
    return `Week ${row.week} vs. ${oppName}`;
  }

  const entries: StatBookEntry[] = [];

  const victories = marginRows.filter((r) => r.margin > 0);
  const defeats = marginRows.filter((r) => r.margin < 0);
  const biggestWin = maxBy(victories, (r) => r.margin);
  const biggestLoss = minBy(defeats, (r) => r.margin);
  const closestWin = minBy(victories, (r) => r.margin);
  if (biggestWin) {
    entries.push({
      label: "Largest Margin of Victory",
      tone: "win",
      teamId: biggestWin.teamId,
      value: `+${fmt(biggestWin.margin)}`,
      detail: matchupDetail(biggestWin),
    });
  }
  if (biggestLoss) {
    entries.push({
      label: "Largest Margin of Defeat",
      tone: "loss",
      teamId: biggestLoss.teamId,
      value: `−${fmt(Math.abs(biggestLoss.margin))}`,
      detail: matchupDetail(biggestLoss),
    });
  }
  if (closestWin) {
    entries.push({
      label: "Smallest Margin of Win",
      tone: "neutral",
      teamId: closestWin.teamId,
      value: `+${fmt(closestWin.margin)}`,
      detail: matchupDetail(closestWin),
    });
  }

  const mostInLoss = maxBy(lossRows, (r) => r.value);
  const fewestInWin = minBy(winRows, (r) => r.value);
  if (mostInLoss) {
    entries.push({
      label: "Most Points in a Loss",
      tone: "neutral",
      teamId: mostInLoss.teamId,
      value: fmt(mostInLoss.value),
      detail: matchupDetail(mostInLoss),
    });
  }
  if (fewestInWin) {
    entries.push({
      label: "Fewest Points in a Win",
      tone: "neutral",
      teamId: fewestInWin.teamId,
      value: fmt(fewestInWin.value),
      detail: matchupDetail(fewestInWin),
    });
  }

  // Longest streaks — walk each team's weeks in chronological order; a tie
  // or a bye breaks both counters (neither extends nor is itself a streak).
  type Streak = { teamId: number; length: number; startWeek: number; endWeek: number };
  let longestWin: Streak | null = null;
  let longestLoss: Streak | null = null;
  for (const teamId of teamIds) {
    let curWinLen = 0;
    let curWinStart = 0;
    let curLossLen = 0;
    let curLossStart = 0;
    for (const week of weeks) {
      const r = week.record.find((x) => x.teamId === teamId);
      if (!r || r.opponentTeamId == null || r.ties === 1) {
        curWinLen = 0;
        curLossLen = 0;
        continue;
      }
      if (r.wins === 1) {
        if (curWinLen === 0) curWinStart = week.week;
        curWinLen++;
        if (!longestWin || curWinLen > longestWin.length) {
          longestWin = { teamId, length: curWinLen, startWeek: curWinStart, endWeek: week.week };
        }
        curLossLen = 0;
      } else if (r.losses === 1) {
        if (curLossLen === 0) curLossStart = week.week;
        curLossLen++;
        if (!longestLoss || curLossLen > longestLoss.length) {
          longestLoss = { teamId, length: curLossLen, startWeek: curLossStart, endWeek: week.week };
        }
        curWinLen = 0;
      }
    }
  }
  if (longestWin) {
    const range = longestWin.startWeek === longestWin.endWeek ? `Week ${longestWin.startWeek}` : `Weeks ${longestWin.startWeek}–${longestWin.endWeek}`;
    entries.push({
      label: "Longest Win Streak",
      tone: "win",
      teamId: longestWin.teamId,
      value: `${longestWin.length} game${longestWin.length === 1 ? "" : "s"}`,
      detail: range,
    });
  }
  if (longestLoss) {
    const range = longestLoss.startWeek === longestLoss.endWeek ? `Week ${longestLoss.startWeek}` : `Weeks ${longestLoss.startWeek}–${longestLoss.endWeek}`;
    entries.push({
      label: "Longest Losing Streak",
      tone: "loss",
      teamId: longestLoss.teamId,
      value: `${longestLoss.length} game${longestLoss.length === 1 ? "" : "s"}`,
      detail: range,
    });
  }

  if (entries.length === 0) return null;
  return {
    title: "Margins & Streaks",
    description: "Blowouts, nail-biters, and the season's hot and cold stretches — real matchup results only.",
    entries,
  };
}

export function buildStatsBook(snapshot: LeagueData, rankings: PowerRankingsData): StatBookSection[] {
  const sections = [
    buildSeasonTotalsSection(snapshot),
    buildActualWeeklySection(rankings),
    buildOptimalWeeklySection(rankings),
    buildMarginsAndStreaksSection(rankings, snapshot),
  ];
  return sections.filter((s): s is StatBookSection => s !== null);
}

/** Small helper so the page doesn't need its own team/owner lookup logic. */
export function teamDisplay(snapshot: LeagueData, teamId: number): { name: string; owner: string } {
  const team = snapshot.teams.find((t) => t.id === teamId);
  if (!team) return { name: `Team ${teamId}`, owner: "" };
  return { name: teamName(team), owner: ownerNames(team) };
}
