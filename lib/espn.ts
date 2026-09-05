/* eslint-disable @typescript-eslint/no-explicit-any -- ESPN's fantasy API is
   unofficial and undocumented, so raw responses are parsed as `any` and
   mapped into the typed shapes in ./types deliberately, rather than
   pretending to know a schema ESPN doesn't publish. */
import "server-only";
import type {
  EspnMatchup,
  EspnTeam,
  EspnTransaction,
  LeagueSnapshot,
  RosterPointsLeader,
} from "./types";

// --- Configuration -------------------------------------------------------
// All four of these come from environment variables so the credentials
// never ship to the browser. See .env.local.example for what's needed.

const LEAGUE_ID = process.env.ESPN_LEAGUE_ID;
const SEASON_ID = process.env.ESPN_SEASON_ID;
const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.ESPN_SWID;

function baseUrl() {
  return `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON_ID}/segments/0/leagues/${LEAGUE_ID}`;
}

function assertConfigured() {
  if (!LEAGUE_ID || !SEASON_ID || !ESPN_S2 || !SWID) {
    throw new Error(
      "Missing ESPN credentials. Set ESPN_LEAGUE_ID, ESPN_SEASON_ID, ESPN_S2, and ESPN_SWID as environment variables."
    );
  }
}

/**
 * A fetch failure here almost always means one of: the season/league ID is
 * wrong, the espn_s2/SWID cookies expired (log into ESPN again to refresh
 * them), or the league hasn't opened for the season yet. Every page that
 * calls into this module catches errors and shows a friendly message
 * instead of crashing, so a bad credential never takes the whole site down.
 */
async function espnFetch<T>(
  path: string,
  params: Record<string, string | string[]>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  assertConfigured();

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, v));
    } else {
      search.append(key, value);
    }
  }

  const url = `${baseUrl()}${path}?${search.toString()}`;
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: "https://fantasy.espn.com/",
      ...extraHeaders,
    },
    // Revalidate every 5 minutes so pages stay fresh without hammering ESPN.
    next: { revalidate: 300 },
  });

  // Read as text first (instead of res.json() directly) so a bad response
  // — empty body, an HTML error page, ESPN's own JSON error payload — comes
  // through as a specific, actionable message instead of a generic parse
  // error. This is the detail to paste back if a page shows "Couldn't
  // reach ESPN": it names the exact status and what ESPN actually sent.
  const bodyText = await res.text();

  if (!res.ok) {
    throw new Error(
      `ESPN API request failed (${res.status} ${res.statusText}) for ${path || "/"}?${search.toString()}. ` +
        `Response body: ${bodyText.slice(0, 300) || "(empty)"}`
    );
  }

  if (!bodyText) {
    throw new Error(
      `ESPN returned an empty response (status ${res.status}) for ${path || "/"}?${search.toString()}. ` +
        `Most often this means the espn_s2/SWID cookies are stale (log into ESPN again and grab fresh values) ` +
        `or ESPN_LEAGUE_ID/ESPN_SEASON_ID don't match a league the logged-in account can see.`
    );
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error(
      `ESPN returned a non-JSON response (status ${res.status}) for ${path || "/"}?${search.toString()}. ` +
        `Response body: ${bodyText.slice(0, 300)}`
    );
  }
}

function mapTeam(raw: any): EspnTeam {
  return {
    id: raw.id,
    abbrev: raw.abbrev,
    location: raw.location,
    nickname: raw.nickname,
    logo: raw.logo,
    owners: raw.owners,
    record: {
      wins: raw.record?.overall?.wins ?? 0,
      losses: raw.record?.overall?.losses ?? 0,
      ties: raw.record?.overall?.ties ?? 0,
      pointsFor: raw.record?.overall?.pointsFor ?? 0,
      pointsAgainst: raw.record?.overall?.pointsAgainst ?? 0,
    },
  };
}

export function teamName(team: EspnTeam): string {
  const name = `${team.location ?? ""} ${team.nickname ?? ""}`.trim();
  return name || team.abbrev || `Team ${team.id}`;
}

/** League name, size, current week, and every team with its record. */
export async function getLeagueSnapshot(): Promise<LeagueSnapshot> {
  const data = await espnFetch<any>("", { view: ["mTeam", "mSettings"] });
  const teams: EspnTeam[] = (data.teams ?? []).map(mapTeam);

  teams.sort((a, b) => {
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
    return b.record.pointsFor - a.record.pointsFor;
  });
  teams.forEach((t, i) => (t.rank = i + 1));

  return {
    leagueName: data.settings?.name ?? "East End Gridiron Championship",
    size: data.settings?.size ?? teams.length,
    currentWeek: data.status?.currentMatchupPeriod ?? data.scoringPeriodId ?? 1,
    seasonId: SEASON_ID ?? "",
    teams,
  };
}

/** Matchups (scores) for a given week. Omit `week` for the current week. */
export async function getScoreboard(week?: number): Promise<EspnMatchup[]> {
  const data = await espnFetch<any>("", {
    view: ["mMatchupScore", "mScoreboard"],
    ...(week ? { scoringPeriodId: String(week) } : {}),
  });

  return (data.schedule ?? [])
    .filter((m: any) => !week || m.matchupPeriodId === week)
    .map((m: any) => ({
      id: m.id,
      matchupPeriodId: m.matchupPeriodId,
      home: m.home
        ? { teamId: m.home.teamId, totalPoints: m.home.totalPoints ?? 0 }
        : undefined,
      away: m.away
        ? { teamId: m.away.teamId, totalPoints: m.away.totalPoints ?? 0 }
        : undefined,
      winner: m.winner,
    }));
}

/** Most recent waiver adds/drops and trades, newest first. */
export async function getTransactions(limit = 25): Promise<EspnTransaction[]> {
  const data = await espnFetch<any>("", { view: ["mTransactions2"] });

  const all: EspnTransaction[] = (data.transactions ?? []).map((t: any) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    proposedDate: t.proposedDate,
    teamId: t.teamId,
    items: (t.items ?? []).map((i: any) => ({
      playerId: i.playerId,
      type: i.type,
      fromTeamId: i.fromTeamId,
      toTeamId: i.toTeamId,
    })),
  }));

  all.sort((a, b) => (b.proposedDate ?? 0) - (a.proposedDate ?? 0));
  return all.slice(0, limit);
}

/**
 * Best-effort player-name lookup by ID. ESPN's transaction feed only
 * returns numeric player IDs, so this hits the players endpoint to resolve
 * names. Falls back to "Player #ID" for any ID it can't resolve, so a shape
 * mismatch here degrades the transaction wire instead of breaking it.
 */
export async function getPlayerNames(
  ids: number[]
): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  assertConfigured();

  try {
    const res = await fetch(
      `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON_ID}/players?scoringPeriodId=0&view=players_wl`,
      {
        headers: {
          Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
          "User-Agent": "Mozilla/5.0",
          "X-Fantasy-Filter": JSON.stringify({
            players: { filterIds: { value: ids } },
          }),
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return {};
    const players = (await res.json()) as any[];
    const map: Record<number, string> = {};
    for (const p of players) {
      if (p?.id) map[p.id] = p.fullName ?? `Player #${p.id}`;
    }
    return map;
  } catch {
    return {};
  }
}

/** Top-scoring rostered players this week, across every team. */
export async function getWeeklyPointsLeaders(
  week: number,
  top = 10
): Promise<RosterPointsLeader[]> {
  const data = await espnFetch<any>("", {
    view: ["mRoster", "mTeam"],
    scoringPeriodId: String(week),
  });

  const leaders: RosterPointsLeader[] = [];
  for (const team of data.teams ?? []) {
    for (const entry of team.roster?.entries ?? []) {
      const poolEntry = entry.playerPoolEntry;
      const player = poolEntry?.player;
      if (!player) continue;
      const statLine = (player.stats ?? []).find(
        (s: any) => s.scoringPeriodId === week && s.statSourceId === 0
      );
      leaders.push({
        playerId: player.id,
        playerName: player.fullName ?? `Player #${player.id}`,
        teamId: team.id,
        points: statLine?.appliedTotal ?? poolEntry?.appliedStatTotal ?? 0,
        position: player.defaultPositionId ? String(player.defaultPositionId) : undefined,
      });
    }
  }

  leaders.sort((a, b) => b.points - a.points);
  return leaders.slice(0, top);
}
