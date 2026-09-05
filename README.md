# East End Gridiron Championship

The league's home base: live standings, power rankings, stat leaders, a
transaction wire, and weekly recaps, pulled from ESPN Fantasy Football.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com)
- Comments/reactions: [Supabase](https://supabase.com) (coming next)

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in your league's values
(or paste them into Vercel's "Environment Variables" step when importing
the project):

| Variable          | Where to find it                                                                 |
| ------------------ | --------------------------------------------------------------------------------- |
| `ESPN_LEAGUE_ID`  | The number in your league's ESPN URL (`...leagueId=1234567`)                    |
| `ESPN_SEASON_ID`  | The season year, e.g. `2026`                                                     |
| `ESPN_S2`         | Cookie value from a logged-in ESPN session (private leagues only — most are)     |
| `ESPN_SWID`       | Cookie value from the same place, wrapped in `{curly braces}`                    |

These are never sent to the browser — every ESPN call happens server-side in
`lib/espn.ts`.

## Updating weekly content

- **Power Rankings**: add a new entry to the top of the array in
  `content/power-rankings.ts`.
- **News / recaps**: add a new post to the top of the array in
  `content/news.ts`.

Both are just typed arrays, so a new weekly edition is a normal code change
— ask Claude to draft it and it'll pull that week's real scores and
transactions to write from.

## Local development

```bash
npm install
npm run dev
```
