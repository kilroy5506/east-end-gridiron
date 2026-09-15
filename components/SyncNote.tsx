import { formatSyncedAgo } from "@/lib/format";

/** Small "Updated N minutes ago" label — data comes from a scheduled sync,
 *  not a live call, so pages say plainly how fresh it is. */
export function SyncNote({ fetchedAt }: { fetchedAt: string | null }) {
  return (
    <span className="text-xs text-muted font-mono-num">{formatSyncedAgo(fetchedAt)}</span>
  );
}

/** Shown in place of real data before the scheduled sync has ever run. */
export function WaitingForSyncPanel({
  workflowName = "Fetch ESPN data",
}: {
  /** Name of the GitHub Actions workflow to mention triggering manually. */
  workflowName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-4">
      <p className="font-heading font-semibold text-sm">Waiting on the first data sync</p>
      <p className="mt-1 text-sm text-muted">
        This page fills in automatically once the scheduled sync runs — check the
        repo&rsquo;s Actions tab, or trigger &ldquo;{workflowName}&rdquo; manually to see it
        right away.
      </p>
    </div>
  );
}
