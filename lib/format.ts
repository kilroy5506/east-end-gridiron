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
