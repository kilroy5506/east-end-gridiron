// Loosely-typed shapes for ESPN's unofficial Fantasy Football v3 API.
// ESPN doesn't publish a schema, so fields are marked optional and every
// consumer should degrade gracefully rather than assume a field is present.

export interface EspnRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface EspnTeam {
  id: number;
  abbrev: string;
  location: string;
  nickname: string;
  logo?: string;
  record: EspnRecord;
  owners?: string[];
  rank?: number;
}

export interface EspnMatchupSide {
  teamId: number;
  totalPoints: number;
}

export interface EspnMatchup {
  id: number;
  matchupPeriodId: number;
  home?: EspnMatchupSide;
  away?: EspnMatchupSide;
  winner?: "HOME" | "AWAY" | "UNDECIDED" | "TIE";
}

export interface EspnTransactionItem {
  playerId: number;
  type: string; // ADD, DROP, TRADE, etc.
  fromTeamId?: number;
  toTeamId?: number;
}

export interface EspnTransaction {
  id: string;
  type: string; // WAIVER, FREEAGENT, TRADE, ROSTER, etc.
  status: string;
  proposedDate?: number;
  teamId?: number;
  items: EspnTransactionItem[];
}

export interface LeagueSnapshot {
  leagueName: string;
  size: number;
  currentWeek: number;
  seasonId: string;
  // Detected automatically from the league's actual ESPN scoring settings
  // (the reception point value) — never hand-configured, so this stays
  // correct if this site is ever pointed at a different league.
  scoringFormat: string;
  pointsPerReception: number;
  teams: EspnTeam[];
}

export interface RosterPointsLeader {
  playerId: number;
  playerName: string;
  teamId: number;
  points: number;
  position?: string;
}

export interface DraftPick {
  overallPickNumber: number;
  round: number;
  roundPickNumber: number;
  teamId: number;
  playerId: number;
  keeper: boolean;
}

// --- Shapes of the data/*.json snapshot files -----------------------------
// Cast JSON imports to these explicitly (see lib/data.ts) rather than
// relying on TypeScript's inferred type for the JSON file's *current*
// content — an empty placeholder array like `"teams": []` would otherwise
// infer as `never[]`, which breaks as soon as real data has fields to use.

export interface LeagueData extends LeagueSnapshot {
  fetchedAt: string | null;
}

export interface ScoreboardData {
  fetchedAt: string | null;
  week: number;
  matchups: EspnMatchup[];
}

export interface TransactionsData {
  fetchedAt: string | null;
  transactions: EspnTransaction[];
  playerNames: Record<number, string>;
}

export interface StatsData {
  fetchedAt: string | null;
  week: number;
  leaders: RosterPointsLeader[];
}

export interface DraftData {
  fetchedAt: string | null;
  seasonId: string;
  drafted: boolean;
  picks: DraftPick[];
  playerNames: Record<number, string>;
}

// --- Power Rankings ---------------------------------------------------------
// Computed by scripts/compute-power-rankings.mjs from Michael's own
// multi-year methodology (not ESPN's) — see that script's header comment
// for exactly how each category is derived. Rank 1 is always best in every
// category; each category rank is worth (numTeams - rank + 1) points
// toward the Power Score, so the best team ends up with the HIGHEST
// Power Score.

export interface PowerRankingCategory {
  rank: number;
}

export interface PowerRankingRecord extends PowerRankingCategory {
  wins: number;
  losses: number;
  ties: number;
}

export interface PowerRankingPoints extends PowerRankingCategory {
  value: number;
}

export interface PowerRankingBreakdown extends PowerRankingCategory {
  wins: number; // all-play wins; a tie counts as 0.5
}

export interface PowerRankingCoachRating extends PowerRankingCategory {
  pct: number; // 0-100, average of (started points / optimal points) per week
}

export interface PowerRankingTeam {
  teamId: number;
  record: PowerRankingRecord;
  pointsScored: PowerRankingPoints;
  breakdown: PowerRankingBreakdown;
  coachRating: PowerRankingCoachRating;
  optimalBreakdown: PowerRankingBreakdown;
  powerScore: number;
  powerRank: number;
  // Display-only stats — NOT part of the Power Score formula above.
  optimalPoints: PowerRankingPoints; // total optimal-lineup points all season
  strengthOfSchedule: PowerRankingPoints; // avg. of real opponents' CURRENT Power Score; rank 1 = toughest schedule
}

// --- Weekly history (per-category, not cumulative) -------------------------
// One entry per played week; each category lists every team's raw value
// and rank for THAT WEEK ALONE — not a running season total. Powers the
// /rankings/[category] week-by-week drill-down pages.

export interface PowerRankingWeeklyRecordEntry {
  teamId: number;
  wins: number;
  losses: number;
  ties: number;
  rank: number;
}

export interface PowerRankingWeeklyValueEntry {
  teamId: number;
  value: number;
  rank: number;
}

export interface PowerRankingWeeklyWinsEntry {
  teamId: number;
  wins: number; // all-play wins that week only; a tie counts as 0.5
  rank: number;
}

export interface PowerRankingWeeklyCoachEntry {
  teamId: number;
  pct: number | null; // 0-100, or null if no optimal lineup could be computed that week
  rank: number;
}

export interface PowerRankingWeek {
  week: number;
  record: PowerRankingWeeklyRecordEntry[];
  pointsScored: PowerRankingWeeklyValueEntry[];
  breakdown: PowerRankingWeeklyWinsEntry[];
  coachRating: PowerRankingWeeklyCoachEntry[];
  optimalBreakdown: PowerRankingWeeklyWinsEntry[];
}

export interface PowerRankingsData {
  fetchedAt: string | null;
  throughWeek: number;
  teams: PowerRankingTeam[];
  weeklyHistory: PowerRankingWeek[];
}
