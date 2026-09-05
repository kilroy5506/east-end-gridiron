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
  teams: EspnTeam[];
}

export interface RosterPointsLeader {
  playerId: number;
  playerName: string;
  teamId: number;
  points: number;
  position?: string;
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
