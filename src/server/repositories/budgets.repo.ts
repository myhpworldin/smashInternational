import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";

const COLLECTION = "budgets";

// Stage 1 Phase 18 §11/§12 — one document per client per period (§12:
// "do not let one monthly budget accidentally combine with another
// month's data"). `periodKey` (YYYY-MM) is the uniqueness key; the admin
// UI built in Phase 13 doesn't yet let an admin pick a period, so
// budget.service.ts always targets the current calendar month — the
// model itself already supports arbitrary historical/future periods for
// whichever future phase adds that control. `remaining` is never stored
// (§7/§15) — always derived at the service layer from
// total/allocated/spent. Recommended indexes: { clientId: 1, periodKey: 1 }
// (unique), { clientId: 1 }.
export type BudgetAllocationEntry = {
  id: string;
  name: string;
  allocated: number;
  spent: number;
};

export type BudgetDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  periodKey: string;
  periodLabel: string;
  total: number;
  allocations: BudgetAllocationEntry[];
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<BudgetDoc>(COLLECTION);
}

export function currentPeriod(): { key: string; label: string } {
  const now = new Date();
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = now.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { key, label };
}

export async function findByClientAndPeriod(
  clientId: ObjectId,
  periodKey: string,
  session?: ClientSession,
): Promise<BudgetDoc | null> {
  return (await collection()).findOne({ clientId, periodKey }, { session });
}

// Most recent period on record for this client, regardless of whether it
// matches the current calendar month — used for the client-facing read
// so a budget configured for "this month" is still visible for the rest
// of that month even as the calendar date advances within it.
export async function findLatestForClient(clientId: ObjectId): Promise<BudgetDoc | null> {
  return (await collection()).find({ clientId }).sort({ periodKey: -1 }).limit(1).next();
}

// Upsert-by-(clientId, periodKey) — creating the current period's budget
// the first time an admin sets a total, updating it on every subsequent
// edit within the same period, matching §11's "do not duplicate total
// budget values."
export async function upsertTotal(
  clientId: ObjectId,
  period: { key: string; label: string },
  total: number,
  actorUserId: ObjectId,
): Promise<BudgetDoc> {
  const now = new Date();
  const result = await (await collection()).findOneAndUpdate(
    { clientId, periodKey: period.key },
    {
      $set: { total, updatedAt: now, updatedByUserId: actorUserId, periodLabel: period.label },
      $setOnInsert: {
        _id: new ObjectId(),
        clientId,
        periodKey: period.key,
        allocations: [],
        createdAt: now,
        createdByUserId: actorUserId,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  // findOneAndUpdate with upsert always returns a document in modern
  // driver versions; the non-null assertion documents that guarantee
  // rather than silently trusting it.
  return result!;
}

// Sets (creates or replaces) one named allocation's `allocated` amount —
// used by budget-change-request approval to apply an approved change.
// `session` is accepted so this can participate in the same transaction
// as the request's own status update.
export async function setAllocationAmount(
  budgetId: ObjectId,
  channelName: string,
  allocated: number,
  session?: ClientSession,
): Promise<void> {
  const coll = await collection();
  const updated = await coll.updateOne(
    { _id: budgetId, "allocations.name": channelName },
    { $set: { "allocations.$.allocated": allocated, updatedAt: new Date() } },
    { session },
  );
  if (updated.matchedCount === 0) {
    await coll.updateOne(
      { _id: budgetId },
      {
        $push: { allocations: { id: new ObjectId().toHexString(), name: channelName, allocated, spent: 0 } },
        $set: { updatedAt: new Date() },
      },
      { session },
    );
  }
}

export async function setTotalAmount(budgetId: ObjectId, total: number, session?: ClientSession): Promise<void> {
  await (await collection()).updateOne({ _id: budgetId }, { $set: { total, updatedAt: new Date() } }, { session });
}
