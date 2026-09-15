import { getLeagueSnapshot, getPowerRankings } from "@/lib/data";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";
import { buildStatsBook, teamDisplay, type StatBookEntry, type StatTone } from "@/lib/stats-book";

const TONE_CLASS: Record<StatTone, string> = {
  win: "text-win",
  loss: "text-loss",
  neutral: "text-accent",
};

function StatCard({ entry, snapshot }: { entry: StatBookEntry; snapshot: ReturnType<typeof getLeagueSnapshot> }) {
  const { name, owner } = teamDisplay(snapshot, entry.teamId);
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-1">
      <span className={`text-xs font-heading uppercase tracking-[0.08em] ${TONE_CLASS[entry.tone]}`}>
        {entry.label}
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{name}</div>
          {owner && owner !== name && <div className="text-xs text-muted">{owner}</div>}
        </div>
        <span className="font-mono-num text-lg font-semibold whitespace-nowrap">{entry.value}</span>
      </div>
      {entry.detail && <div className="text-xs text-muted">{entry.detail}</div>}
    </div>
  );
}

export default function StatsBookPage() {
  const snapshot = getLeagueSnapshot();
  const rankings = getPowerRankings();
  const hasData = snapshot.fetchedAt !== null;
  const sections = hasData ? buildStatsBook(snapshot, rankings) : [];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
            Records &amp; Moments
          </p>
          <h1 className="font-heading text-3xl font-bold mt-1">Stats Book</h1>
          <p className="text-muted mt-2 max-w-2xl text-sm">
            The season&rsquo;s highs, lows, blowouts, and nail-biters, updated automatically
            alongside the weekly Power Rankings computation.
          </p>
        </div>
        {hasData && <SyncNote fetchedAt={rankings.fetchedAt ?? snapshot.fetchedAt} />}
      </section>

      {!hasData && <WaitingForSyncPanel />}

      {hasData && sections.length === 0 && (
        <p className="text-sm text-muted">
          Season totals will appear here once the first data sync runs; the weekly records
          (ceilings, floors, margins, streaks) fill in once the &ldquo;Compute power
          rankings&rdquo; job has run for at least one week.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="font-heading text-lg font-semibold">{section.title}</h2>
          {section.description && (
            <p className="text-sm text-muted mt-1 mb-3 max-w-2xl">{section.description}</p>
          )}
          <div className={`grid gap-3 sm:grid-cols-2 ${section.description ? "" : "mt-3"}`}>
            {section.entries.map((entry) => (
              <StatCard key={`${section.title}-${entry.label}`} entry={entry} snapshot={snapshot} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
