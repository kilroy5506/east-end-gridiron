export interface PowerRankingsCommentary {
  /** Matches PowerRankingsData.throughWeek from data/power-rankings.json. */
  week: number;
  publishedAt: string;
  intro: string;
}

/**
 * Optional commentary layered on top of the COMPUTED rankings in
 * data/power-rankings.json — the numbers, order, and every category come
 * from scripts/compute-power-rankings.mjs (Michael's own methodology: sum
 * of category ranks across Record, Points Scored, Breakdown, Coach Rating,
 * and Optimal Breakdown), not from anything written here. This file only
 * adds an optional intro paragraph above that table.
 *
 * Add a new entry to the FRONT of this array once a week's numbers are in
 * if you want intro commentary; the rankings page works fine with no entry
 * for the current week too — it just skips the intro. Ask Claude to write
 * one from that week's real numbers and storylines once you're a couple
 * days in.
 */
export const powerRankingsCommentary: PowerRankingsCommentary[] = [];
