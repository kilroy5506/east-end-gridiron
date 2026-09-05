import Link from "next/link";
import { getLeagueSnapshot, getScoreboard, teamName } from "@/lib/data";
import { formatPoints, formatRecord } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";
import { powerRankings } from "@/content/power-rankings";
import { newsPosts } from "@/content/news";

export default function Home() {
  const snapshot = getLeagueSnapshot();
  const scoreboard = getScoreboard();
  const hasData = snapshot.fetchedAt !== null;

  const latestRanking = powerRankings[0];
  const latestPost = newsPosts[0];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
            Week {snapshot.currentWeek}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-1 text-balance">
            {snapshot.leagueName}
          </h1>
        </div>
        {hasData && <SyncNote fetchedAt={snapshot.fetchedAt} />}
      </section>

      {!hasData && <WaitingForSyncPanel />}

      {hasData && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">Standings</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Team</th>
                  <th className="py-2 px-2 font-medium text-right">Record</th>
                  <th className="py-2 pr-4 pl-2 font-medium text-right font-mono-num">PF</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.teams.map((team) => (
                  <tr key={team.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pl-4 pr-2 text-muted font-mono-num">{team.rank}</td>
                    <td className="py-2.5 px-2 font-medium">{teamName(team)}</td>
                    <td className="py-2.5 px-2 text-right font-mono-num text-muted">
                      {formatRecord(team.record.wins, team.record.losses, team.record.ties)}
                    </td>
                    <td className="py-2.5 pr-4 pl-2 text-right font-mono-num">
                      {formatPoints(team.record.pointsFor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hasData && scoreboard.matchups.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">
            This Week&rsquo;s Matchups
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {scoreboard.matchups.map((m) => {
              const home = snapshot.teams.find((t) => t.id === m.home?.teamId);
              const away = snapshot.teams.find((t) => t.id === m.away?.teamId);
              if (!home || !away) return null;
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{teamName(away)}</span>
                  <span className="font-mono-num text-muted px-2">
                    {formatPoints(m.away?.totalPoints ?? 0)} &ndash; {formatPoints(m.home?.totalPoints ?? 0)}
                  </span>
                  <span className="font-medium text-right">{teamName(home)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/rankings"
          className="rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors px-5 py-4 flex flex-col gap-1"
        >
          <span className="font-heading text-xs uppercase tracking-[0.1em] text-accent">
            Power Rankings
          </span>
          <span className="font-semibold">
            #{latestRanking.entries[0]?.rank ?? 1}: {latestRanking.entries[0]?.teamName ?? "—"}
          </span>
          <span className="text-sm text-muted line-clamp-2">{latestRanking.intro}</span>
        </Link>

        <Link
          href={`/news/${latestPost.slug}`}
          className="rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors px-5 py-4 flex flex-col gap-1"
        >
          <span className="font-heading text-xs uppercase tracking-[0.1em] text-accent">
            Latest News
          </span>
          <span className="font-semibold">{latestPost.title}</span>
          <span className="text-sm text-muted line-clamp-2">{latestPost.excerpt}</span>
        </Link>
      </section>
    </div>
  );
}
