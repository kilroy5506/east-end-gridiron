import { getLeagueSnapshot, getPowerRankings, ownerNames, teamName } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";
import { powerRankingsCommentary } from "@/content/power-rankings";

/** Small stacked "value, then category rank" cell used for every category
 *  column — keeps the table scannable without needing five separate legends. */
function RankedCell({ value, rank }: { value: string; rank: number }) {
  return (
    <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
      <div>{value}</div>
      <div className="text-xs text-muted">#{rank}</div>
    </td>
  );
}

export default function RankingsPage() {
  const rankings = getPowerRankings();
  const snapshot = getLeagueSnapshot();
  const hasData = rankings.fetchedAt !== null && rankings.teams.length > 0;
  const commentary = powerRankingsCommentary.find((c) => c.week === rankings.throughWeek);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
            {hasData ? `Through Week ${rankings.throughWeek}` : "Power Rankings"}
          </p>
          <h1 className="font-heading text-3xl font-bold mt-1">Power Rankings</h1>
          {commentary && (
            <p className="text-muted mt-2 max-w-2xl">{commentary.intro}</p>
          )}
        </div>
        {hasData && <SyncNote fetchedAt={rankings.fetchedAt} />}
      </section>

      {!hasData && <WaitingForSyncPanel workflowName="Compute power rankings" />}

      {hasData && (
        <>
          <section className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Team</th>
                  <th className="py-2 px-3 font-medium text-right">Power Score</th>
                  <th className="py-2 px-3 font-medium text-right">Record</th>
                  <th className="py-2 px-3 font-medium text-right">Points</th>
                  <th className="py-2 px-3 font-medium text-right">Breakdown</th>
                  <th className="py-2 px-3 font-medium text-right">Coach Rating</th>
                  <th className="py-2 pr-4 pl-3 font-medium text-right">Optimal BD</th>
                </tr>
              </thead>
              <tbody>
                {rankings.teams.map((row) => {
                  const team = snapshot.teams.find((t) => t.id === row.teamId);
                  if (!team) return null;
                  const recordLabel =
                    row.record.ties > 0
                      ? `${row.record.wins}-${row.record.losses}-${row.record.ties}`
                      : `${row.record.wins}-${row.record.losses}`;
                  return (
                    <tr key={row.teamId} className="border-b border-border last:border-0">
                      <td className="py-2.5 pl-4 pr-2 text-muted font-mono-num">{row.powerRank}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-medium">{teamName(team)}</div>
                        {ownerNames(team) && ownerNames(team) !== teamName(team) && (
                          <div className="text-xs text-muted">{ownerNames(team)}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold whitespace-nowrap">
                        {row.powerScore}
                      </td>
                      <RankedCell value={recordLabel} rank={row.record.rank} />
                      <RankedCell value={formatPoints(row.pointsScored.value)} rank={row.pointsScored.rank} />
                      <RankedCell value={row.breakdown.wins.toFixed(1)} rank={row.breakdown.rank} />
                      <RankedCell value={`${row.coachRating.pct.toFixed(1)}%`} rank={row.coachRating.rank} />
                      <RankedCell
                        value={row.optimalBreakdown.wins.toFixed(1)}
                        rank={row.optimalBreakdown.rank}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <details className="rounded-lg border border-border bg-surface px-5 py-4">
            <summary className="cursor-pointer font-heading font-semibold text-sm">
              How Power Score works
            </summary>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <p>
                Every team gets ranked (1 = best) in five categories. The five ranks are added
                together into a Power Score — lower is better — and that total is ranked again
                for the final order above.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1">
                <li>
                  <strong className="text-foreground">Record</strong> — real wins/losses/ties against
                  each week&rsquo;s actual opponent.
                </li>
                <li>
                  <strong className="text-foreground">Points</strong> — total points scored all season.
                </li>
                <li>
                  <strong className="text-foreground">Breakdown</strong> — &ldquo;all-play&rdquo; wins:
                  each week, a team is credited a win for every other team it outscored that
                  week (a tie counts as half a win), regardless of who it actually played.
                </li>
                <li>
                  <strong className="text-foreground">Coach Rating</strong> — the average share of each
                  week&rsquo;s best-possible lineup score that the manager&rsquo;s actual
                  start/sit decisions captured.
                </li>
                <li>
                  <strong className="text-foreground">Optimal BD</strong> — the same all-play
                  calculation as Breakdown, but using each team&rsquo;s optimal lineup score
                  instead of what was actually started, to measure roster strength on its own.
                </li>
              </ul>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
