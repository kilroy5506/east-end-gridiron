# East End Gridiron Championship

The league's home base: live standings, power rankings, stat leaders, a
transaction wire, and weekly recaps, pulled from ESPN Fantasy Football.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com)
- Comments/reactions: [Supabase](https://supabase.com) (coming next)

## How the ESPN data gets here

The site does **not** call ESPN's API live when someone visits — a scheduled
GitHub Action (`.github/workflows/fetch-espn-data.yml`, running roughly every
15 minutes) calls ESPN, writes the results into `data/*.json`, and commits
them. Every commit triggers a fresh Vercel deploy, so the site always shows
the last synced snapshot rather than making a visitor wait on an external
API — and each page shows an "Updated N minutes ago" note so it's clear how
fresh the data is.

The league is set to publicly viewable in ESPN's settings, so no login
cookies are needed — the fetch script only needs `ESPN_LEAGUE_ID` and
`ESPN_SEASON_ID`, both set directly as plain (non-secret) values in the
workflow file. Update the season there each year.

To pull a fresh snapshot immediately instead of waiting for the schedule: go
to the repo's **Actions** tab → **Fetch ESPN data** → **Run workflow**.

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

To test the data sync locally:

```bash
ESPN_LEAGUE_ID=1040047778 ESPN_SEASON_ID=2026 node scripts/fetch-espn-data.mjs
```
