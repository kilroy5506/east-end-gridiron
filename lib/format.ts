export function formatPoints(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function formatDate(ms?: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const TRANSACTION_LABELS: Record<string, string> = {
  WAIVER: "Waiver claim",
  FREEAGENT: "Free agent pickup",
  TRADE: "Trade",
  ROSTER: "Roster move",
};

export function transactionLabel(type: string): string {
  return TRANSACTION_LABELS[type] ?? type;
}

const ITEM_LABELS: Record<string, string> = {
  ADD: "added",
  DROP: "dropped",
  TRADE_ACCEPT: "traded for",
};

export function itemLabel(type: string): string {
  return ITEM_LABELS[type] ?? type.toLowerCase();
}

/** "Updated 4 minutes ago" style label for a data snapshot's fetchedAt. */
export function formatSyncedAgo(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes === 1) return "Updated 1 minute ago";
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Updated 1 hour ago";
  if (hours < 24) return `Updated ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Updated 1 day ago" : `Updated ${days} days ago`;
}
