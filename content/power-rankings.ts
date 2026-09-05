export interface PowerRankingEntry {
  teamName: string;
  rank: number;
  blurb: string;
  movement?: "up" | "down" | "same" | "new";
}

export interface PowerRankingsWeek {
  week: number;
  publishedAt: string;
  intro: string;
  entries: PowerRankingEntry[];
}

/**
 * Add a new object to the FRONT of this array each week — the rankings page
 * always shows powerRankings[0] as the current edition and lists the rest
 * as history. Ask Claude to draft the next edition once you're a couple
 * days into the week; it'll pull that week's real scores and transactions
 * to write from.
 */
export const powerRankings: PowerRankingsWeek[] = [
  {
    week: 0,
    publishedAt: new Date().toISOString().slice(0, 10),
    intro:
      "Placeholder edition — this is a stand-in so the page isn't empty. Once Week 1 wraps, ask Claude to write the real power rankings and this gets replaced.",
    entries: [
      {
        teamName: "Your Team Here",
        rank: 1,
        blurb:
          "Sample entry. Real rankings will reference actual records, points, and roster moves once the season's underway.",
        movement: "new",
      },
    ],
  },
];
