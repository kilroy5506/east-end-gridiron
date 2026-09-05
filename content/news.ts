export interface NewsPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: string[];
}

/**
 * Add new posts to the FRONT of this array — the news page lists them
 * newest first. Ask Claude for a weekly recap once the games are in; give
 * it the league's inside jokes and rivalries and it'll write in that voice
 * using the week's real scores and transactions.
 */
export const newsPosts: NewsPost[] = [
  {
    slug: "welcome-to-league-hq",
    title: "The League Finally Has a Home",
    date: new Date().toISOString().slice(0, 10),
    excerpt:
      "Standings, power rankings, stat leaders, and the transaction wire, all in one place. Here's what's live and what's coming.",
    body: [
      "East End Gridiron Championship HQ is live. Standings and this week's matchups pull straight from ESPN, so the numbers here are always current — no more digging through the app.",
      "Power Rankings and the weekly recap column are where the league's actual personality shows up. Expect both to update after games wrap each week.",
      "Comments are coming next, so you'll be able to argue about the rankings directly on the site instead of in six different groupchats.",
    ],
  },
];
