// Single source of truth for the five Power Ranking categories — shared
// between the main /rankings table (column headers + the "how it works"
// explainer) and the /rankings/[category] week-by-week drill-down pages,
// so the label/description text only has to be written once.

export type PowerRankingCategorySlug =
  | "record"
  | "points"
  | "breakdown"
  | "coach-rating"
  | "optimal-breakdown";

export interface PowerRankingCategoryMeta {
  slug: PowerRankingCategorySlug;
  /** Short label used as the table column header. */
  shortLabel: string;
  /** Full name used as the drill-down page's title. */
  label: string;
  description: string;
}

export const POWER_RANKING_CATEGORIES: PowerRankingCategoryMeta[] = [
  {
    slug: "record",
    shortLabel: "Record",
    label: "Record",
    description: "Real wins, losses, and ties against each week's actual opponent.",
  },
  {
    slug: "points",
    shortLabel: "Points",
    label: "Points Scored",
    description: "Total points scored, week by week.",
  },
  {
    slug: "breakdown",
    shortLabel: "Breakdown",
    label: "Breakdown",
    description:
      "\u201cAll-play\u201d wins: each week, a team is credited a win for every other team it outscored that week (a tie counts as half a win), regardless of who it actually played.",
  },
  {
    slug: "coach-rating",
    shortLabel: "Coach Rating",
    label: "Coach Rating",
    description:
      "The share of that week's best-possible lineup score that the manager's actual start/sit decisions captured.",
  },
  {
    slug: "optimal-breakdown",
    shortLabel: "Optimal Points Breakdown",
    label: "Optimal Points Breakdown",
    description:
      "The same all-play calculation as Breakdown, but using each team's optimal lineup score instead of what was actually started, to measure roster strength on its own.",
  },
];

export function getCategoryMeta(slug: string): PowerRankingCategoryMeta | undefined {
  return POWER_RANKING_CATEGORIES.find((c) => c.slug === slug);
}
