// Idempotent index setup — there's no ORM/migration framework in this
// project (raw mongodb driver throughout), so "migration" here means
// creating indexes safely re-runnable against the live database.
//
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();

    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    // No separate "clients" collection anymore — onboarding has no login,
    // so there's no pre-provisioned account to link to. Each onboarding
    // record is self-contained, identified by accessToken.
    await db.collection("onboarding").createIndex({ clientId: 1 }, { unique: true });
    await db.collection("onboarding").createIndex({ accessToken: 1 }, { unique: true });
    await db.collection("onboarding").createIndex({ status: 1 });
    await db.collection("onboarding").createIndex({ submittedAt: 1 });

    await db.collection("onboarding_assets").createIndex({ onboardingId: 1 });
    await db.collection("onboarding_assets").createIndex({ clientId: 1 });

    // Stage 1 Phase 3 — service engagements. Not a unique index: a client
    // can have any number of historical (completed/cancelled) engagements
    // for the same service alongside at most one live one, and enforcing
    // "at most one live" at the index level would need a partial index
    // keyed on a dedicated live/not-live discriminator field (Mongo's
    // partial-index filter expressions don't reliably support the "status
    // in this list" check that distinction actually needs) — deferred
    // until a later phase's status-transition writes make that worth
    // adding. Uniqueness is enforced at the application level instead (see
    // serviceEngagements.repo.ts's findLiveByClientAndService), the same
    // accepted trade-off serviceAssignments already uses.
    await db.collection("serviceEngagements").createIndex({ clientId: 1, serviceId: 1 });
    await db.collection("serviceEngagements").createIndex({ sourceOnboardingId: 1 });
    await db.collection("serviceEngagements").createIndex({ status: 1 });

    // Stage 1 Phase 4 — the shared status-transition log (onboarding and
    // service-engagement entries share one collection; see
    // statusHistory.repo.ts).
    await db.collection("statusHistory").createIndex({ entityType: 1, entityId: 1 });
    await db.collection("statusHistory").createIndex({ clientId: 1 });

    // Stage 1 Phase 17 — projects/milestones/deliverables.
    await db.collection("projects").createIndex({ clientId: 1 });
    await db.collection("projects").createIndex({ serviceEngagementId: 1 });
    await db.collection("projects").createIndex({ clientId: 1, status: 1 });
    await db.collection("projectMilestones").createIndex({ projectId: 1, order: 1 });
    await db.collection("projectDeliverables").createIndex({ projectId: 1 });

    // Stage 1 Phase 18 — campaigns/budgets/budget change requests.
    await db.collection("campaigns").createIndex({ clientId: 1 });
    await db.collection("campaigns").createIndex({ serviceEngagementId: 1 });
    await db.collection("campaigns").createIndex({ clientId: 1, status: 1 });
    await db.collection("budgets").createIndex({ clientId: 1, periodKey: 1 }, { unique: true });
    await db.collection("budgetChangeRequests").createIndex({ clientId: 1 });
    await db.collection("budgetChangeRequests").createIndex({ status: 1 });

    // Stage 1 Phase 19 — daily performance records. The unique index is
    // the natural-key duplicate-prevention boundary itself (client +
    // service + campaign/project + reportingDate) — dailyRecordsRepo's
    // upsert relies on this exact key shape matching its filter.
    await db
      .collection("dailyPerformanceRecords")
      .createIndex({ clientId: 1, serviceId: 1, campaignOrProjectId: 1, reportingDate: 1 }, { unique: true });
    await db.collection("dailyPerformanceRecords").createIndex({ clientId: 1, reportingDate: 1 });

    // Stage 1 Phase 20 — analysis/aggregation query shapes: service-level
    // date-range summaries, and campaign/project-level analysis (which
    // filters by that id directly, without a clientId prefix).
    await db.collection("dailyPerformanceRecords").createIndex({ clientId: 1, serviceId: 1, reportingDate: 1 });
    await db.collection("dailyPerformanceRecords").createIndex({ campaignOrProjectId: 1, reportingDate: 1 });

    console.log("Indexes created/verified.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
