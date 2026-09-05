import {
  getLeagueSnapshot,
  getPlayerNames,
  getTransactions,
  teamName,
} from "@/lib/espn";
import { formatDate, itemLabel, transactionLabel } from "@/lib/format";
import { ErrorPanel } from "@/components/ErrorPanel";
import type { EspnTeam } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 300;
export const runtime = "edge";

export default async function TransactionsPage() {
  let transactions: Awaited<ReturnType<typeof getTransactions>> = [];
  let teams: EspnTeam[] = [];
  let playerNames: Record<number, string> = {};
  let loadError: string | null = null;

  try {
    const snapshot = await getLeagueSnapshot();
    teams = snapshot.teams;
    transactions = await getTransactions(30);
    const playerIds = transactions.flatMap((t) => t.items.map((i) => i.playerId));
    playerNames = await getPlayerNames([...new Set(playerIds)]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Unknown error";
  }

  function findTeam(id?: number) {
    return teams.find((t) => t.id === id);
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
          The Wire
        </p>
        <h1 className="font-heading text-3xl font-bold mt-1">Transactions</h1>
      </section>

      {loadError && (
        <ErrorPanel
          title="Couldn't load transactions right now"
          message={`${loadError}.`}
        />
      )}

      {transactions.length > 0 && (
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

      {!loadError && transactions.length === 0 && (
        <p className="text-muted text-sm">No transactions yet this season.</p>
      )}
    </div>
  );
}
