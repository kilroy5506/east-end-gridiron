import Link from "next/link";
import { getLeagueSnapshot, getPowerRankings, getScoreboard, ownerNames, teamName } from "@/lib/data";
import { formatPoints, formatRecord } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";
import { newsPosts } from "@/content/news";

/** Small stacked "value, then rank" cell — same pattern used on /rankings,
 *  repeated here for the standings table's Power-Ranking-derived columns. */
function RankedCell({ value, rank }: { value: string; rank?: number }) {
  return (
    <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
      <div>{value}</div>
      <div className="text-xs text-muted">{rank ? `#${rank}` : "—"}</div>
    </td>
  );
}

export default function Home() {
  const snapshot = getLeagueSnapshot();
  const scoreboard = getScoreboard();
  const rankings = getPowerRankings();
  const hasData = snapshot.fetchedAt !== null;
  const hasRankingsData = rankings.fetchedAt !== null && rankings.teams.length > 0;
  const rankingsByTeamId = new Map(rankings.teams.map((t) => [t.teamId, t]));

  const topRanked = rankings.teams.find((t) => t.powerRank === 1);
  const topRankedTeam = topRanked ? snapshot.teams.find((t) => t.id === topRanked.teamId) : undefined;
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
                  <th className="py-2 px-2 font-medium text-right font-mono-num">PF</th>
                  <th className="py-2 px-2 font-medium text-right font-mono-num">PA</th>
                  <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Breakdown</th>
                  <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Power Ranking</th>
                  <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Optimal Lineup Pts</th>
                  <th className="py-2 pr-4 pl-3 font-medium text-right whitespace-nowrap">SOS</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.teams.map((team) => {
                  const pr = rankingsByTeamId.get(team.id);
                  return (
                    <tr key={team.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pl-4 pr-2 text-muted font-mono-num">{team.rank}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-medium">{teamName(team)}</div>
                        {ownerNames(team) && ownerNames(team) !== teamName(team) && (
                          <div className="text-xs text-muted">{ownerNames(team)}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num text-muted">
                        {formatRecord(team.record.wins, team.record.losses, team.record.ties)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num">
                        {formatPoints(team.record.pointsFor)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num text-muted">
                        {formatPoints(team.record.pointsAgainst)}
                      </td>
                      <RankedCell
                        value={hasRankingsData && pr ? pr.breakdown.wins.toFixed(1) : "—"}
                        rank={pr?.breakdown.rank}
                      />
                      <RankedCell
                        value={hasRankingsData && pr ? String(pr.powerScore) : "—"}
                        rank={pr?.powerRank}
                      />
                      <RankedCell
                        value={
                          hasRankingsData && pr?.optimalPoints
                            ? formatPoints(pr.optimalPoints.value)
                            : "—"
                        }
                        rank={pr?.optimalPoints?.rank}
                      />
                      <RankedCell
                        value={
                          hasRankingsData && pr?.strengthOfSchedule
                            ? formatPoints(pr.strengthOfSchedule.value)
                            : "—"
                        }
                        rank={pr?.strengthOfSchedule?.rank}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!hasRankingsData && (
            <p className="text-xs text-muted mt-2">
              Breakdown, Power Ranking, Optimal Lineup Pts, and SOS fill in once the first
              weekly Power Rankings computation runs.
            </p>
          )}
          {hasRankingsData && (
            <p className="text-xs text-muted mt-2">
              SOS is the average <em>current</em> Power Score of each team&rsquo;s actual
              opponents so far &mdash; #1 has faced the toughest schedule.{" "}
              <Link href="/rankings" className="hover:text-foreground hover:underline">
                Full Power Rankings breakdown &rarr;
              </Link>
            </p>
          )}
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
          {topRankedTeam ? (
            <>
              <span className="font-semibold">#1: {teamName(topRankedTeam)}</span>
              <span className="text-sm text-muted line-clamp-2">
                Through Week {rankings.throughWeek} — ranked on record, points, all-play
                breakdown, and coaching efficiency, not just the standings.
              </span>
            </>
          ) : (
            <span className="text-sm text-muted line-clamp-2">
              Fills in once the first weekly computation runs.
            </span>
          )}
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
