import "server-only";
import type { ClientSession, MongoClient } from "mongodb";

function isTransactionsUnsupported(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("does not support retryable writes") ||
    message.includes("Transaction numbers are only allowed on a replica set member")
  );
}

// Runs `fn` inside a multi-document transaction when the connected
// deployment supports one (a replica set or mongos) — the "all or
// nothing" guarantee every cascading admin action here (block, delete,
// role change away from staff, a direct availability change) was written
// to depend on — and falls back to running the exact same writes without
// a session otherwise. A standalone mongod (the default for local dev,
// and some self-hosted setups) rejects `session.withTransaction` outright
// on its very first write attempt inside it; without this fallback, every
// one of those actions fails outright with a 500 in exactly that
// environment, even though nothing is actually wrong with the writes
// themselves. The fallback is best-effort rather than atomic, which is
// still strictly better than the action not working at all.
export async function runWithOptionalTransaction(
  client: MongoClient,
  fn: (session: ClientSession | undefined) => Promise<void>,
): Promise<void> {
  const session = client.startSession();
  let needsFallback = false;
  try {
    await session.withTransaction(() => fn(session));
  } catch (err) {
    if (!isTransactionsUnsupported(err)) throw err;
    needsFallback = true;
  } finally {
    await session.endSession();
  }

  if (needsFallback) {
    await fn(undefined);
  }
}
