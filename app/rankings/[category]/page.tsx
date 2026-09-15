import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagueSnapshot, getPowerRankings, ownerNames, teamName } from "@/lib/data";
import { formatPoints, formatRecord } from "@/lib/format";
import {
  POWER_RANKING_CATEGORIES,
  getCategoryMeta,
  type PowerRankingCategorySlug,
} from "@/lib/power-ranking-categories";
import type { PowerRankingTeam, PowerRankingWeek } from "@/lib/types";

export function generateStaticParams() {
  return POWER_RANKING_CATEGORIES.map((c) => ({ category: c.slug }));
}

/** This week's value + rank for one team, in the given category — every
 *  category has a differently-shaped weekly entry (wins, a point value, a
 *  W/L/T result, a percentage), so this is the one place that switches on
 *  the category to pick the right field and format it consistently. */
function weekCell(
  week: PowerRankingWeek,
  slug: PowerRankingCategorySlug,
  teamId: number
): { label: string; rank: number | null } {
  switch (slug) {
    case "record": {
      const e = week.record.find((x) => x.teamId === teamId);
      if (!e) return { label: "—", rank: null };
      const label = e.wins > 0 ? "W" : e.losses > 0 ? "L" : e.ties > 0 ? "T" : "—";
      return { label, rank: e.rank };
    }
    case "points": {
      const e = week.pointsScored.find((x) => x.teamId === teamId);
      return e ? { label: formatPoints(e.value), rank: e.rank } : { label: "—", rank: null };
    }
    case "breakdown": {
      const e = week.breakdown.find((x) => x.teamId === teamId);
      return e ? { label: e.wins.toFixed(1), rank: e.rank } : { label: "—", rank: null };
    }
    case "coach-rating": {
      const e = week.coachRating.find((x) => x.teamId === teamId);
      if (!e || e.pct == null) return { label: "—", rank: null };
      return { label: `${e.pct.toFixed(1)}%`, rank: e.rank };
    }
    case "optimal-breakdown": {
      const e = week.optimalBreakdown.find((x) => x.teamId === teamId);
      return e ? { label: e.wins.toFixed(1), rank: e.rank } : { label: "—", rank: null };
    }
  }
}

/** Season-to-date value + rank for one team, in the given category —
 *  mirrors weekCell but reads from the main teams[] summary instead of a
 *  single week's snapshot. */
function seasonCell(
  team: PowerRankingTeam,
  slug: PowerRankingCategorySlug
): { label: string; rank: number } {
  switch (slug) {
    case "record":
      return {
        label: formatRecord(team.record.wins, team.record.losses, team.record.ties),
        rank: team.record.rank,
      };
    case "points":
      return { label: formatPoints(team.pointsScored.value), rank: team.pointsScored.rank };
    case "breakdown":
      return { label: team.breakdown.wins.toFixed(1), rank: team.breakdown.rank };
    case "coach-rating":
      return { label: `${team.coachRating.pct.toFixed(1)}%`, rank: team.coachRating.rank };
    case "optimal-breakdown":
      return { label: team.optimalBreakdown.wins.toFixed(1), rank: team.optimalBreakdown.rank };
  }
}

export default async function CategoryHistoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) notFound();

  const rankings = getPowerRankings();
  const snapshot = getLeagueSnapshot();
  const teamsById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const seasonRowById = new Map(rankings.teams.map((t) => [t.teamId, t]));
  const weeks = rankings.weeklyHistory ?? [];
  const hasHistory = weeks.length > 0;

  // Order teams by their current season rank in this specific category —
  // a more useful default than league-wide Power Rank when you're looking
  // at one category on its own.
  const orderedTeamIds = [...rankings.teams]
    .sort((a, b) => seasonCell(a, meta.slug).rank - seasonCell(b, meta.slug).rank)
    .map((t) => t.teamId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/rankings" className="text-sm text-muted hover:text-foreground">
          &larr; Power Rankings
        </Link>
        <h1 className="font-heading text-3xl font-bold mt-2">{meta.label}</h1>
        <p className="text-muted mt-1 max-w-2xl">{meta.description}</p>
        <p className="text-xs text-muted mt-2">
          Each week below is that week alone, not a running total — useful for spotting a
          team&rsquo;s trend, and for checking a given week&rsquo;s numbers at a glance. The
          Season column on the right is the cumulative total shown on the main Power Rankings
          page.
        </p>
      </div>

      {!hasHistory && (
        <p className="text-sm text-muted">
          No weekly history yet — this fills in once the &ldquo;Compute power rankings&rdquo;
          job has run for at least one week.
        </p>
      )}

      {hasHistory && (
        <section className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pl-4 pr-2 font-medium sticky left-0 bg-background">Team</th>
                {weeks.map((w) => (
                  <th key={w.week} className="py-2 px-3 font-medium text-right whitespace-nowrap">
                    Wk {w.week}
                  </th>
                ))}
                <th className="py-2 pr-4 pl-3 font-medium text-right whitespace-nowrap">Season</th>
              </tr>
            </thead>
            <tbody>
              {orderedTeamIds.map((teamId) => {
                const team = teamsById.get(teamId);
                const seasonRow = seasonRowById.get(teamId);
                if (!team || !seasonRow) return null;
                const season = seasonCell(seasonRow, meta.slug);
                return (
                  <tr key={teamId} className="border-b border-border last:border-0">
                    <td className="py-2.5 pl-4 pr-2 sticky left-0 bg-background">
                      <div className="font-medium text-foreground">{teamName(team)}</div>
                      {ownerNames(team) && ownerNames(team) !== teamName(team) && (
                        <div className="text-xs text-muted">{ownerNames(team)}</div>
                      )}
                    </td>
                    {weeks.map((w) => {
                      const cell = weekCell(w, meta.slug, teamId);
                      return (
                        <td key={w.week} className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                          <div>{cell.label}</div>
                          <div className="text-xs text-muted">{cell.rank ? `#${cell.rank}` : "—"}</div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 pr-4 pl-3 text-right font-mono-num font-semibold whitespace-nowrap">
                      <div>{season.label}</div>
                      <div className="text-xs text-muted font-normal">#{season.rank}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
