// Writes a new "News" article automatically, once a week, right after
// scripts/compute-power-rankings.mjs finishes — no template-based AI, just
// real computed numbers assembled into recap prose (Michael's choice: no
// new API key/secret, no cost, no risk of an unreviewed article inventing a
// fact). Reads:
//   - data/power-rankings.json — THIS week's freshly-computed rankings
//     (already written by compute-power-rankings.mjs by the time this runs)
//   - /tmp/power-rankings-previous.json — a copy of LAST week's
//     data/power-rankings.json, snapshotted by the workflow BEFORE the
//     compute step overwrote it. Used only for week-over-week movement
//     (rank/Power Score changes) — nothing else here depends on it, so a
//     missing/empty snapshot (the very first run ever) just means the
//     recap skips the "Movers" section instead of failing. Only trusted
//     when it's genuinely from an EARLIER week (prev.throughWeek < this
//     week) — a same-week snapshot (e.g. from re-running the workflow
//     twice in one week while testing) is ignored, so Week 1 can never
//     show bogus "movement" against itself. (Fixed 2026-09-15 after
//     exactly that happened to the real Week 1 recap.)
//   - data/league.json — team/owner names.
//   - data/power-rankings-recaps.json — the running list of past
//     auto-generated recaps, so re-running this for a week that's already
//     been written about is a no-op rather than a duplicate post.
// Writes an updated data/power-rankings-recaps.json (same file, with the
// new post prepended) in the { generatedAt, posts: NewsPost[] } shape that
// lib/news.ts merges with the hand-written posts in content/news.ts.

import { readFile, writeFile } from "node:fs/promises";

const PREVIOUS_SNAPSHOT_PATH = process.env.PREVIOUS_RANKINGS_PATH ?? "/tmp/power-rankings-previous.json";

async function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function teamLabel(team) {
  const name = `${team?.location ?? ""} ${team?.nickname ?? ""}`.trim();
  if (name) return name;
  const owners = team?.owners && team.owners.length > 0 ? team.owners.join(" & ") : "";
  return owners || team?.abbrev || `Team ${team?.id}`;
}

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function maxBy(items, valueOf) {
  return items.reduce((best, item) => (!best || valueOf(item) > valueOf(best) ? item : best), null);
}
function minBy(items, valueOf) {
  return items.reduce((best, item) => (!best || valueOf(item) < valueOf(best) ? item : best), null);
}

async function main() {
  const curr = await readJsonSafe("data/power-rankings.json", null);
  if (!curr || curr.fetchedAt == null || !Array.isArray(curr.teams) || curr.teams.length === 0) {
    console.log("No power-rankings.json (or it's empty) — nothing to recap yet.");
    return;
  }
  const week = curr.throughWeek;
  const weeklyHistory = curr.weeklyHistory ?? [];
  const thisWeek = weeklyHistory.find((w) => w.week === week);
  if (!thisWeek) {
    console.log(`data/power-rankings.json has no weeklyHistory entry for week ${week} — skipping recap.`);
    return;
  }

  const recaps = await readJsonSafe("data/power-rankings-recaps.json", { generatedAt: null, posts: [] });
  if ((recaps.posts ?? []).some((p) => p.weekNumber === week)) {
    console.log(`A recap for week ${week} already exists — skipping (nothing new to report).`);
    return;
  }

  const league = await readJsonSafe("data/league.json", { teams: [] });
  const teamsById = new Map((league.teams ?? []).map((t) => [t.id, t]));
  const label = (teamId) => teamLabel(teamsById.get(teamId));

  const prev = await readJsonSafe(PREVIOUS_SNAPSHOT_PATH, null);
  const hasPrev = !!(
    prev &&
    Array.isArray(prev.teams) &&
    prev.teams.length > 0 &&
    typeof prev.throughWeek === "number" &&
    prev.throughWeek > 0 &&
    prev.throughWeek < week // must be a genuinely earlier week, not a same-week retest
  );
  const prevByTeamId = hasPrev ? new Map(prev.teams.map((t) => [t.teamId, t])) : new Map();

  const sortedByRank = [...curr.teams].sort((a, b) => a.powerRank - b.powerRank);

  // --- "As is": the full Power Rankings board, with movement vs last week ---
  const boardLines = sortedByRank.map((t) => {
    const prevEntry = prevByTeamId.get(t.teamId);
    let movement = "";
    if (prevEntry) {
      const delta = prevEntry.powerRank - t.powerRank; // positive = moved up
      movement = delta > 0 ? ` (▲${delta})` : delta < 0 ? ` (▼${Math.abs(delta)})` : " (–)";
    }
    return `- **${t.powerRank}. ${label(t.teamId)}**${movement} — ${t.powerScore} pts`;
  });

  // --- Movers: only meaningful once there's a previous week to compare to ---
  const moverLines = [];
  let dethronedLine = null;
  if (hasPrev) {
    const oldNumberOne = prev.teams.find((t) => t.powerRank === 1);
    const newNumberOne = curr.teams.find((t) => t.powerRank === 1);
    if (oldNumberOne && newNumberOne && oldNumberOne.teamId !== newNumberOne.teamId) {
      dethronedLine = `**${label(newNumberOne.teamId)}** takes over the #1 spot from **${label(oldNumberOne.teamId)}**.`;
    }

    const withDelta = curr.teams
      .map((t) => {
        const prevEntry = prevByTeamId.get(t.teamId);
        return prevEntry ? { teamId: t.teamId, delta: prevEntry.powerRank - t.powerRank } : null;
      })
      .filter((x) => x !== null);
    const topRiser = maxBy(withDelta, (x) => x.delta);
    const topFaller = minBy(withDelta, (x) => x.delta);
    if (topRiser && topRiser.delta > 0) {
      moverLines.push(
        `- **${label(topRiser.teamId)}** climbed ${topRiser.delta} spot${topRiser.delta === 1 ? "" : "s"} this week.`
      );
    }
    if (topFaller && topFaller.delta < 0) {
      moverLines.push(
        `- **${label(topFaller.teamId)}** fell ${Math.abs(topFaller.delta)} spot${Math.abs(topFaller.delta) === 1 ? "" : "s"} this week.`
      );
    }

    const prevMaxScore = maxBy(prev.teams, (t) => t.powerScore)?.powerScore ?? -Infinity;
    const currMaxScore = maxBy(curr.teams, (t) => t.powerScore)?.powerScore ?? -Infinity;
    if (currMaxScore > prevMaxScore) {
      const holder = curr.teams.find((t) => t.powerScore === currMaxScore);
      moverLines.push(
        `- **${label(holder.teamId)}**'s Power Score of ${holder.powerScore} is the highest anyone has posted this season.`
      );
    }
  }

  // --- This week's box score highlights (always available, even week 1) ----
  const thisWeekHigh = maxBy(thisWeek.pointsScored, (e) => e.value);
  const thisWeekLow = minBy(thisWeek.pointsScored, (e) => e.value);
  const thisWeekVictories = thisWeek.record.filter((r) => r.opponentTeamId != null && r.margin > 0);
  const thisWeekBiggestWin = maxBy(thisWeekVictories, (r) => r.margin);
  const thisWeekClosestWin = minBy(thisWeekVictories, (r) => r.margin);

  const thisWeekLines = [];
  if (thisWeekHigh) {
    thisWeekLines.push(`- **${label(thisWeekHigh.teamId)}** put up the week's high score: ${fmt(thisWeekHigh.value)}.`);
  }
  if (thisWeekLow) {
    thisWeekLines.push(`- **${label(thisWeekLow.teamId)}** had the week's low score: ${fmt(thisWeekLow.value)}.`);
  }
  if (thisWeekBiggestWin) {
    const loserId = thisWeekBiggestWin.opponentTeamId;
    thisWeekLines.push(
      `- **${label(thisWeekBiggestWin.teamId)}** posted the week's biggest margin of victory, beating **${label(loserId)}** by ${fmt(thisWeekBiggestWin.margin)}.`
    );
  }
  if (thisWeekClosestWin && thisWeekClosestWin !== thisWeekBiggestWin) {
    const loserId = thisWeekClosestWin.opponentTeamId;
    thisWeekLines.push(
      `- **${label(thisWeekClosestWin.teamId)}** survived the week's closest game, edging **${label(loserId)}** by just ${fmt(thisWeekClosestWin.margin)}.`
    );
  }

  // --- Season milestones: only flagged when THIS week set the record ------
  const milestoneLines = [];
  const priorWeeks = weeklyHistory.filter((w) => w.week !== week);

  const allPointsRows = weeklyHistory.flatMap((w) => w.pointsScored.map((e) => ({ ...e, week: w.week })));
  const priorPointsRows = priorWeeks.flatMap((w) => w.pointsScored.map((e) => ({ ...e, week: w.week })));
  const seasonHigh = maxBy(allPointsRows, (r) => r.value);
  const priorHigh = maxBy(priorPointsRows, (r) => r.value);
  if (seasonHigh && seasonHigh.week === week && (!priorHigh || seasonHigh.value > priorHigh.value)) {
    milestoneLines.push(
      `- **New season-high single week score:** ${label(seasonHigh.teamId)} with ${fmt(seasonHigh.value)}.`
    );
  }
  const seasonLow = minBy(allPointsRows, (r) => r.value);
  const priorLow = minBy(priorPointsRows, (r) => r.value);
  if (seasonLow && seasonLow.week === week && (!priorLow || seasonLow.value < priorLow.value)) {
    milestoneLines.push(
      `- **New season-low single week score:** ${label(seasonLow.teamId)} with ${fmt(seasonLow.value)}.`
    );
  }

  const allMarginRows = weeklyHistory.flatMap((w) =>
    w.record.filter((r) => r.opponentTeamId != null).map((r) => ({ ...r, week: w.week }))
  );
  const priorMarginRows = priorWeeks.flatMap((w) =>
    w.record.filter((r) => r.opponentTeamId != null).map((r) => ({ ...r, week: w.week }))
  );
  const allVictories = allMarginRows.filter((r) => r.margin > 0);
  const priorVictories = priorMarginRows.filter((r) => r.margin > 0);
  const seasonBiggestWin = maxBy(allVictories, (r) => r.margin);
  const priorBiggestWin = maxBy(priorVictories, (r) => r.margin);
  if (seasonBiggestWin && seasonBiggestWin.week === week && (!priorBiggestWin || seasonBiggestWin.margin > priorBiggestWin.margin)) {
    milestoneLines.push(
      `- **New biggest blowout of the season:** ${label(seasonBiggestWin.teamId)} over ${label(seasonBiggestWin.opponentTeamId)} by ${fmt(seasonBiggestWin.margin)}.`
    );
  }
  const seasonClosestWin = minBy(allVictories, (r) => r.margin);
  const priorClosestWin = minBy(priorVictories, (r) => r.margin);
  if (seasonClosestWin && seasonClosestWin.week === week && (!priorClosestWin || seasonClosestWin.margin < priorClosestWin.margin)) {
    milestoneLines.push(
      `- **New closest win of the season:** ${label(seasonClosestWin.teamId)} over ${label(seasonClosestWin.opponentTeamId)} by just ${fmt(seasonClosestWin.margin)}.`
    );
  }

  // Longest win/loss streaks — walk every team's weeks in order; a tie or a
  // bye breaks both counters. Only flag it if the league-wide record streak
  // is CURRENTLY ONGOING and ended (i.e. was extended to its record length)
  // this week.
  const teamIds = curr.teams.map((t) => t.teamId);
  let longestWin = null;
  let longestLoss = null;
  for (const teamId of teamIds) {
    let curWinLen = 0;
    let curLossLen = 0;
    for (const w of weeklyHistory) {
      const r = w.record.find((x) => x.teamId === teamId);
      if (!r || r.opponentTeamId == null || r.ties === 1) {
        curWinLen = 0;
        curLossLen = 0;
        continue;
      }
      if (r.wins === 1) {
        curWinLen++;
        if (!longestWin || curWinLen > longestWin.length) longestWin = { teamId, length: curWinLen, endWeek: w.week };
        curLossLen = 0;
      } else if (r.losses === 1) {
        curLossLen++;
        if (!longestLoss || curLossLen > longestLoss.length) longestLoss = { teamId, length: curLossLen, endWeek: w.week };
        curWinLen = 0;
      }
    }
  }
  if (longestWin && longestWin.endWeek === week && longestWin.length > 1) {
    milestoneLines.push(
      `- **New longest win streak of the season:** ${label(longestWin.teamId)}, now at ${longestWin.length} straight.`
    );
  }
  if (longestLoss && longestLoss.endWeek === week && longestLoss.length > 1) {
    milestoneLines.push(
      `- **New longest losing streak of the season:** ${label(longestLoss.teamId)}, now at ${longestLoss.length} straight.`
    );
  }

  // --- Assemble the article --------------------------------------------
  const numberOne = curr.teams.find((t) => t.powerRank === 1);
  const excerptBits = [`${label(numberOne.teamId)} holds the #1 spot after Week ${week} with a Power Score of ${numberOne.powerScore}.`];
  if (dethronedLine) excerptBits.push(`New team at the top this week.`);
  else if (milestoneLines.length > 0) excerptBits.push(`Plus a new season record.`);

  const bodyParts = [];
  bodyParts.push(`Week ${week} is in the books, and the Power Rankings have been recomputed from this season's real results — record, points scored, all-play breakdown, coaching efficiency, and optimal-lineup breakdown, all rolled into one Power Score.`);

  bodyParts.push("## This Week's Power Rankings");
  bodyParts.push(boardLines.join("\n"));

  if (hasPrev && (dethronedLine || moverLines.length > 0)) {
    bodyParts.push("## Movers");
    bodyParts.push([dethronedLine, ...moverLines].filter(Boolean).join("\n"));
  }

  if (milestoneLines.length > 0) {
    bodyParts.push("## Milestones");
    bodyParts.push(milestoneLines.join("\n"));
  }

  bodyParts.push("## By the Numbers, Week " + week);
  bodyParts.push(thisWeekLines.join("\n"));

  bodyParts.push("---");
  bodyParts.push(`Full breakdown, every category, and the week-by-week history: [Power Rankings](/rankings) and the [Stats Book](/stats-book).`);

  const body = bodyParts.filter(Boolean).join("\n\n");

  const post = {
    slug: `power-rankings-week-${week}`,
    title: `Power Rankings Recap: Week ${week}`,
    date: new Date().toISOString().slice(0, 10),
    excerpt: excerptBits.join(" "),
    body,
    weekNumber: week,
  };

  const updatedPosts = [post, ...(recaps.posts ?? [])];
  await writeFile(
    "data/power-rankings-recaps.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), posts: updatedPosts }, null, 2)
  );
  console.log(`Wrote recap for week ${week}: "${post.title}"`);
}

main().catch((err) => {
  console.error("generate-power-rankings-recap failed:", err);
  process.exit(1);
});
