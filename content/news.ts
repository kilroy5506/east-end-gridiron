export interface NewsPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  /**
   * Markdown-lite: blank-line-separated paragraphs, "## Heading" /
   * "### Subheading" (auto-linkable via an id built from the heading
   * text), "---" as a divider, "- " list items, and inline **bold** /
   * [text](url) (internal anchors like #team-3 work too). Rendered by
   * lib/markdown-lite.tsx — see that file for exactly what's supported.
   */
  body: string;
  /**
   * Set only on auto-generated weekly Power Rankings recaps (see
   * scripts/generate-power-rankings-recap.mjs and lib/news.ts) — lets the
   * generator tell "already wrote this week's recap" from "haven't yet"
   * without re-parsing the post. Hand-written posts here just omit it.
   */
  weekNumber?: number;
}

/**
 * Add new posts to the FRONT of this array — the news page lists them
 * newest first. Ask Claude for a weekly recap once the games are in; give
 * it the league's inside jokes and rivalries and it'll write in that voice
 * using the week's real scores and transactions.
 */
export const newsPosts: NewsPost[] = [
  {
    slug: "2026-draft-recap",
    title: "2026 Draft Recap: Value, Reaches, and Every Team's Grade",
    date: "2026-09-08",
    excerpt:
      "All 160 picks checked against real market ADP — who got a steal, who reached, and what every roster actually looks like heading into Week 1.",
    body: `The East End Gridiron Championship's 2026 draft is in the books — 10 teams, 16 rounds, 160 picks, full PPR scoring confirmed straight from the league's own settings. Before the season could get away from us, we pulled every pick and checked it against real market consensus (current 2026 PPR average draft position, pulled from FantasyFootballCalculator's live ADP tool, which tracks thousands of mock drafts run in the days leading into Week 1). ADP isn't gospel — it's just what the field expected. Which makes it exactly the right yardstick for figuring out who this league's actual sharks are.

Here's who won the draft, who's still explaining themselves, and what every roster actually looks like heading into the season.

---

## League Awards

**Draft Value MVP — Jonathan Avery.** Nobody came close. Across all 16 rounds, Jonathan's picks landed later than their consensus ADP more often, and by a wider margin, than anyone else in the league. Dak Prescott in Round 10, Bucky Irving in Round 8, and Jakobi Meyers in Round 12 all fell multiple rounds past their market price, and he backed it up with four real rookie roles late — Travis Hunter, Harold Fannin Jr., TreVeyon Henderson, and Kyle Monangai — while the rest of the room had moved on.

**Boldest Pick of the Draft — Shep Shepherd, Lamar Jackson (Round 1, Pick 2).** The single biggest gap between a draft slot and the market anywhere in this draft belongs to the very first round. Jackson's current ADP sits in the fifth round; Shep took him second overall. That's either the read of the draft or the pick this recap gets to bring up all season — probably both.

**Steal of the Draft — Michael Farris, Matthew Stafford (Round 14, Pick 132).** The single largest gap between a pick and its market price anywhere in the draft. Stafford's current ADP is a Round 8 pick; he landed on Michael's bench nearly six rounds later, for almost nothing.

**Reach of the Draft — Brandon Baxter, Jaxson Dart (Round 6, Pick 56).** Setting the kickers below aside, this is the biggest reach on a skill-position player in the league. Dart's consensus price is a Round 12 pick; Brandon paid Round 6. If it hits, he'll have been six rounds ahead of the field on a QB1. If it doesn't, this is the pick.

**Special Teams Enthusiasts — Shep Shepherd and John Bregger.** Most leagues wait until the final two rounds to draft a kicker. These two decided Rounds 6 and 7 were close enough, taking Brandon Aubrey and Jason Myers roughly five rounds ahead of the field — the exact same size reach, down to the decimal, for both of them.

**Future Now Award — Jonathan Avery.** Four true rookies on one roster (Harold Fannin Jr., TreVeyon Henderson, Travis Hunter, Kyle Monangai) is the deepest rookie bet in the league, and it's the same team sitting atop the value board. Either a coincidence or a strategy.

---

## Draft Order and the Board's Opening Run

John Bregger led off with Bijan Robinson at 1.01, right in line with where the field had him. Shep Shepherd's Lamar Jackson pick at 1.02 was the first real fork in the draft — the market had a running back or receiver going there, not a quarterback. Jacob Reedy (Jahmyr Gibbs) and Jonathan Avery (Jaxon Smith-Njigba, the first wide receiver off the board) rounded out the top four right on schedule. Trey McBride went to John Bregger at pick 21 as the first tight end selected, and the first defense — Shep Shepherd's Texans — didn't come off the board until pick 42, a sign this league is still willing to punt streaming units deep into the draft.

Every team walked away with four or five running backs and four or five receivers — nobody tried a true zero-RB build this year — so the real separation in this draft happened less in roster construction and more in the value of the individual names each team landed at each turn.

---

## Team-by-Team Grades

### Jonathan Avery — Grade: A

The best value draft in the league, and it's not close. Jaxon Smith-Njigba at 1.04 was fair value to open, and from there almost everything fell his way: Dak Prescott in Round 10, Bucky Irving in Round 8, and Jakobi Meyers in Round 12 all landed multiple rounds after the rest of the field was still bidding on them. The only real reach on the sheet is Harold Fannin Jr., a rookie tight end taken a couple of rounds ahead of his market price in Round 6 — a fair price to pay for a roster that also stashed Travis Hunter, TreVeyon Henderson, and Kyle Monangai as extra swings on the league's deepest rookie class.

### Michael Farris — Grade: A-

Christian McCaffrey and Justin Jefferson at the 1-2 turn were both dead-on market value, which made the swings later in the draft easy to spot: Tyler Warren in Round 5 and MarShawn Lloyd in Round 9 both went further ahead of their market price than most of the league was willing to pay. It didn't matter. Matthew Stafford in Round 14 is the single biggest value pick in the entire draft — nearly six rounds after his current ADP — and Jameson Williams, Mike Evans, and Rashee Rice all landed clean discounts too.

### Nick Yacovazzi — Grade: B+

James Cook III and CeeDee Lamb at the 1-2 turn were both squarely on-market. The one stretch worth flagging is Rounds 5 and 6, where Jalen Hurts and then Sam LaPorta both went well ahead of their current price — LaPorta in particular came off the board five rounds before the rest of the league was ready to take him. Everything after that was a recovery: Alec Pierce, Courtland Sutton, Chuba Hubbard, Brian Thomas Jr., and Jared Goff all landed multiple rounds past their market value, which is what pulled this roster's overall grade back into the league's top half.

### Shep Shepherd — Grade: B

The most boom-or-bust draft in the league. Lamar Jackson at 1.02 is the single boldest pick anywhere on the board — five rounds ahead of his current market price at a position that usually rewards patience — and this roster also owns the league's earliest kicker pick (Brandon Aubrey, Round 6). But the picks in between are as good as anyone's: David Montgomery, Luther Burden III, Tee Higgins, and J.K. Dobbins all landed multiple rounds past their market price, with Malik Nabers and Chase Brown both fair-to-good value early. High variance, real upside, and a grade that could look very different by Thanksgiving depending on how the Jackson bet plays out.

### Jacob Reedy — Grade: B

A patient, board-respecting draft from top to bottom. Jahmyr Gibbs at 1.03 and A.J. Brown at 2.08 were both fair value, and the only real reaches on the sheet are George Kittle in Round 6 and Justin Herbert in Round 9 — both a couple of rounds ahead of their current price. Everything else fell right into value: Tetairoa McMillan, Emeka Egbuka, Jaylen Waddle, and Rhamondre Stevenson all landed multiple rounds past their market cost, and there isn't a pick on this roster that looks like a real problem heading into the season.

### Daniel Foster — Grade: B-

Jonathan Taylor and Saquon Barkley at the front of this draft were both fair value, and Jayden Daniels falling into Round 5 looked like a real find at the time. This roster also had the fewest mystery picks in the league — all but one selection (a Week 1 streaming defense) landed inside the market's current top 150, more than anyone else. The volume came with real swings both ways: an early kicker (Cameron Dicker, Round 10) and Jake Ferguson a couple of rounds ahead of the field cost value, but Christian Watson in Round 9 and Quentin Johnston in Round 15 both fell about as far as almost any pick in this draft, just two-tenths of a point behind the league's single biggest steal.

### Jeff McCormick — Grade: C+

Ja'Marr Chase at 1.08 anchors a roster that mostly stayed within a round of market value. The one real outlier is Tucker Kraft, taken four rounds ahead of his current price in Round 7 — by far the biggest swing on this sheet. The rest mostly nets out: George Pickens and Omarion Hampton landed close to their market cost in either direction, while Jaylen Warren and Chris Godwin Jr. both fell nicely into value in the back half. Steady, if unremarkable, outside of that one tight end reach.

### John Bregger — Grade: C+

The top of this draft is about as clean as it gets — Bijan Robinson at 1.01 and Kenneth Walker III at 2.10 were both dead-on market value, and Trey McBride as the first tight end off the board was a fair price. Jason Myers in Round 7 is the earliest a kicker went anywhere in this draft, and Brock Purdy a couple of rounds early in Round 6 cost some value too. But the back half quietly outproduced most of the league: Jordan Addison, Jordan Mason, Michael Wilson, and Xavier Worthy all fell well past their market price in the double-digit rounds. Read past the two outliers and the skill-position core here is genuinely solid.

### Will Hadley — Grade: C

Puka Nacua at 1.06 was good value to start, and DK Metcalf and Chris Olave both landed multiple rounds past their market price later on. Two picks did most of the damage to this grade, though: Travis Kelce in Round 7, taken well ahead of his current price, and a kicker (Ka'imi Fairbairn) in Round 10 — five rounds earlier than the rest of the league was willing to go. Strip those two out and this is a perfectly reasonable, if unspectacular, draft.

### Brandon Baxter — Grade: C-

Amon-Ra St. Brown at 1.05 was right on the number, and Cam Skattebo in Round 4 landed at the exact pick the market had him — 36th overall, on the nose. The back half of this draft quietly outproduced the field, too: DJ Moore, Marvin Harrison Jr., Parker Washington, and Rico Dowdle all fell multiple rounds past their market price in Rounds 7 through 10. The grade comes down to one pick — Jaxson Dart at pick 56, a full six rounds ahead of his current price, and the single biggest reach anywhere in this draft. If he starts and produces, this roster ages very well.

---

Ten teams, ten different bets, and — for at least one league member — a QB1 pick that's either brilliant or the punchline of the year. That's what makes checking back in after Week 1 worth doing.

Jump straight to your team:

- [Michael Farris](#michael-farris-grade-a)
- [Nick Yacovazzi](#nick-yacovazzi-grade-b)
- [Jeff McCormick](#jeff-mccormick-grade-c)
- [Jonathan Avery](#jonathan-avery-grade-a)
- [Brandon Baxter](#brandon-baxter-grade-c)
- [Daniel Foster](#daniel-foster-grade-b)
- [Jacob Reedy](#jacob-reedy-grade-b)
- [Will Hadley](#will-hadley-grade-c)
- [Shep Shepherd](#shep-shepherd-grade-b)
- [John Bregger](#john-bregger-grade-c)`,
  },
  {
    slug: "welcome-to-league-hq",
    title: "The League Finally Has a Home",
    date: "2026-09-01",
    excerpt:
      "Standings, power rankings, stat leaders, and the transaction wire, all in one place. Here's what's live and what's coming.",
    body: `East End Gridiron Championship HQ is live. Standings and this week's matchups pull straight from ESPN, so the numbers here are always current — no more digging through the app.

Power Rankings and the weekly recap column are where the league's actual personality shows up. Expect both to update after games wrap each week.

Comments are coming next, so you'll be able to argue about the rankings directly on the site instead of in six different groupchats.`,
  },
];
