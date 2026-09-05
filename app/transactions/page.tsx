import { getLeagueSnapshot, getTransactionsData, teamName } from "@/lib/data";
import { formatDate, itemLabel, transactionLabel } from "@/lib/format";
import { SyncNote, WaitingForSyncPanel } from "@/components/SyncNote";

export default function TransactionsPage() {
  const snapshot = getLeagueSnapshot();
  const { transactions, playerNames, fetchedAt } = getTransactionsData();
  const hasData = fetchedAt !== null;

  function findTeam(id?: number) {
    return snapshot.teams.find((t) => t.id === id);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
            The Wire
          </p>
          <h1 className="font-heading text-3xl font-bold mt-1">Transactions</h1>
        </div>
        {hasData && <SyncNote fetchedAt={fetchedAt} />}
      </section>

      {!hasData && <WaitingForSyncPanel />}

      {hasData && transactions.length > 0 && (
        <section className="flex flex-col gap-2">
          {transactions.map((t) => {
            const team = findTeam(t.teamId);
            return (
              <div
                key={t.id}
                className="rounded-lg border border-border bg-surface px-4 py-3 flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {team ? teamName(team) : "A team"}
                  </span>{" "}
                  <span className="text-muted">&mdash; {transactionLabel(t.type)}</span>
                  <ul className="mt-1 text-muted">
                    {t.items.map((item, idx) => (
                      <li key={idx}>
                        {itemLabel(item.type)}{" "}
                        <span className="text-foreground font-medium">
                          {playerNames[item.playerId] ?? `Player #${item.playerId}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="text-xs text-muted font-mono-num whitespace-nowrap">
                  {formatDate(t.proposedDate)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {hasData && transactions.length === 0 && (
        <p className="text-muted text-sm">No transactions yet this season.</p>
      )}
    </div>
  );
}
