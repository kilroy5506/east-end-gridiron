import { getLeagueSnapshot, getStatsData, teamName } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";

export default function StatsPage() {
  const snapshot = getLeagueSnapshot();
  const stats = getStatsData();
  const hasData = stats.fetchedAt !== null;

  const seasonLeaders = [...snapshot.teams]
    .sort((a, b) => b.record.pointsFor - a.record.pointsFor)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
            Through Week {stats.week}
          </p>
          <h1 className="font-heading text-3xl font-bold mt-1">Stats to Watch</h1>
        </div>
        {hasData && <SyncNote fetchedAt={stats.fetchedAt} />}
      </section>

      {!hasData && <WaitingForSyncPanel />}

      {hasData && stats.leaders.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">
            Top Scorers This Week
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {stats.leaders.map((leader, i) => (
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
