import Link from "next/link";
import { getLeagueSnapshot, getPowerRankings, ownerNames, teamName } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";
import { powerRankingsCommentary } from "@/content/power-rankings";
import { POWER_RANKING_CATEGORIES } from "@/lib/power-ranking-categories";

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

/** Column header for one of the five categories — links to its
 *  week-by-week drill-down page (/rankings/[category]). */
function CategoryHeader({ slug, label }: { slug: string; label: string }) {
  return (
    <th className="py-2 px-3 font-medium text-right whitespace-nowrap">
      <Link href={`/rankings/${slug}`} className="hover:text-foreground hover:underline">
        {label}
      </Link>
    </th>
  );
}

export default function RankingsPage() {
  const rankings = getPowerRankings();
  const snapshot = getLeagueSnapshot();
  const hasData = rankings.fetchedAt !== null && rankings.teams.length > 0;
  const commentary = powerRankingsCommentary.find((c) => c.week === rankings.throughWeek);
  const cat = Object.fromEntries(POWER_RANKING_CATEGORIES.map((c) => [c.slug, c]));

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
                  <CategoryHeader slug={cat.record.slug} label={cat.record.shortLabel} />
                  <CategoryHeader slug={cat.points.slug} label={cat.points.shortLabel} />
                  <CategoryHeader slug={cat.breakdown.slug} label={cat.breakdown.shortLabel} />
                  <CategoryHeader slug={cat["coach-rating"].slug} label={cat["coach-rating"].shortLabel} />
                  <CategoryHeader
                    slug={cat["optimal-breakdown"].slug}
                    label={cat["optimal-breakdown"].shortLabel}
                  />
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
                Every team gets ranked (1 = best) in five categories. Each category rank earns
                points toward a Power Score — the best team in a category earns the most points,
                the last-place team earns the fewest — and those five point totals are added
                together and ranked again for the final order above. Higher Power Score is
                better.
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1">
                {POWER_RANKING_CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/rankings/${c.slug}`} className="text-foreground font-semibold hover:underline">
                      {c.label}
                    </Link>{" "}
                    — {c.description}
                  </li>
                ))}
              </ul>
              <p className="text-xs">
                Click any category above (in the table header or this list) to see the
                week-by-week numbers behind it.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
