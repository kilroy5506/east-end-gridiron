import { powerRankings } from "@/content/power-rankings";
import { formatDate } from "@/lib/format";

const MOVEMENT_ICON: Record<string, string> = {
  up: "▲",
  down: "▼",
  same: "–",
  new: "NEW",
};

const MOVEMENT_COLOR: Record<string, string> = {
  up: "text-win",
  down: "text-loss",
  same: "text-muted",
  new: "text-accent",
};

export default function RankingsPage() {
  const [current, ...history] = powerRankings;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
          Week {current.week} &middot; {formatDate(new Date(current.publishedAt).getTime())}
        </p>
        <h1 className="font-heading text-3xl font-bold mt-1">Power Rankings</h1>
        <p className="text-muted mt-2 max-w-2xl">{current.intro}</p>
      </section>

      <section className="flex flex-col gap-3">
        {current.entries.map((entry) => (
          <div
            key={entry.teamName}
            className="rounded-lg border border-border bg-surface px-5 py-4 flex gap-4 items-start"
          >
            <div className="font-heading text-2xl font-bold text-accent w-9 text-center shrink-0">
              {entry.rank}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{entry.teamName}</span>
                {entry.movement && (
                  <span className={`text-xs font-mono-num ${MOVEMENT_COLOR[entry.movement]}`}>
                    {MOVEMENT_ICON[entry.movement]}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted mt-1">{entry.blurb}</p>
            </div>
          </div>
        ))}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="font-heading text-lg font-semibold mb-3">Previous Weeks</h2>
          <div className="flex flex-col gap-2">
            {history.map((week) => (
              <details key={week.week} className="rounded-lg border border-border bg-surface px-5 py-3">
                <summary className="cursor-pointer font-medium text-sm">
                  Week {week.week} &middot; {formatDate(new Date(week.publishedAt).getTime())}
                </summary>
                <ol className="mt-3 flex flex-col gap-1 text-sm text-muted">
                  {week.entries.map((entry) => (
                    <li key={entry.teamName}>
                      {entry.rank}. {entry.teamName}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
