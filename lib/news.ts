import { newsPosts, type NewsPost } from "@/content/news";
import recapsData from "@/data/power-rankings-recaps.json";

interface PowerRankingsRecapsData {
  generatedAt: string | null;
  posts: NewsPost[];
}

const recaps = recapsData as PowerRankingsRecapsData;

/**
 * Every news post the site should show, newest first: Michael's
 * hand-written posts from content/news.ts merged with the auto-generated
 * weekly Power Rankings recaps in data/power-rankings-recaps.json (written
 * by scripts/generate-power-rankings-recap.mjs in CI, no push required).
 * Kept as two separate sources on disk — one hand-edited, one
 * machine-written — so Michael's manual edits and the Action's automated
 * commits never touch the same file; this is where they're combined for
 * display.
 */
export function getAllNewsPosts(): NewsPost[] {
  const all = [...newsPosts, ...(recaps.posts ?? [])];
  return all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
