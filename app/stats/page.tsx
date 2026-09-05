import { getLeagueSnapshot, getWeeklyPointsLeaders, teamName } from "@/lib/espn";
import { formatPoints } from "@/lib/format";
import { ErrorPanel } from "@/components/ErrorPanel";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function StatsPage() {
  let snapshot;
  let leaders: Awaited<ReturnType<typeof getWeeklyPointsLeaders>> = [];
  let loadError: string | null = null;

  try {
    snapshot = await getLeagueSnapshot();
    leaders = await getWeeklyPointsLeaders(snapshot.currentWeek, 10);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Unknown error";
  }

  const seasonLeaders = snapshot
    ? [...snapshot.teams].sort((a, b) => b.record.pointsFor - a.record.pointsFor).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
          {snapshot ? `Through Week ${snapshot.currentWeek}` : "Stat Leaders"}
        </p>
        <h1 className="font-heading text-3xl font-bold mt-1">Stats to Watch</h1>
      </section>

      {loadError && (
        <ErrorPanel
          title="Couldn't load stats right now"
          message={`${loadError}. Player-level stats are the trickiest part of ESPN's API to reverse-engineer, so if this keeps happening, tell Claude the exact error and it can adjust the field mapping.`}
        />
      )}

      {leaders.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">
            Top Scorers This Week
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {leaders.map((leader, i) => (
              <div
                key={leader.playerId}
                className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 bg-surface text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="text-muted font-mono-num w-5">{i + 1}</span>
                  <span className="font-medium">{leader.playerName}</span>
                </span>
                <span className="font-mono-num text-accent">{formatPoints(leader.points)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {seasonLeaders.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">
            Most Points Scored, Season
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {seasonLeaders.map((team, i) => (
              <div
                key={team.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 bg-surface text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="text-muted font-mono-num w-5">{i + 1}</span>
                  <span className="font-medium">{teamName(team)}</span>
                </span>
                <span className="font-mono-num text-accent">
                  {formatPoints(team.record.pointsFor)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
