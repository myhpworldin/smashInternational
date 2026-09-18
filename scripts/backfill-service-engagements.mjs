// Stage 1 Phase 3 — one-off, idempotent backfill: creates a
// serviceEngagements record for each selected service on every onboarding
// record that was already "approved" before this phase existed (so it
// never went through createEngagementsForApprovedOnboarding in
// reviewSubmission()). Safe to re-run any number of times — for each
// (clientId, serviceId) pair it only inserts if no "live" engagement
// already exists (same check the real approval path uses), so running
// this twice, or running it after the real path has since created some of
// these, never produces duplicates. Never deletes or overwrites anything.
//
// Doesn't re-validate selectedServiceIds against the current service
// catalog (shared/config/services.ts) — a .mjs script can't cheaply import
// that .ts module, and every id here already passed that exact validation
// once, at original submission time. An id the catalog has since dropped
// is backfilled as-is and flagged in the summary rather than silently
// skipped, so nothing is invented and nothing is silently lost.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-service-engagements.mjs --dry-run
//   node --env-file=.env.local scripts/backfill-service-engagements.mjs
import { MongoClient } from "mongodb";

const LIVE_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "planning",
  "ready_to_start",
  "active",
  "paused",
  "on_hold",
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const onboardingColl = db.collection("onboarding");
    const engagementsColl = db.collection("serviceEngagements");

    const approvedDocs = await onboardingColl.find({ status: "approved" }).toArray();
    console.log(`Found ${approvedDocs.length} approved onboarding record(s).`);

    let created = 0;
    let alreadyLive = 0;
    const knownServiceIdsSeen = new Set();

    for (const doc of approvedDocs) {
      for (const serviceId of doc.selectedServiceIds ?? []) {
        knownServiceIdsSeen.add(serviceId);

        const existing = await engagementsColl.findOne({
          clientId: doc.clientId,
          serviceId,
          status: { $in: LIVE_STATUSES },
        });
        if (existing) {
          alreadyLive++;
          continue;
        }

        console.log(
          `${dryRun ? "[dry-run] would create" : "Creating"} engagement: client=${doc.clientId} service=${serviceId} (from onboarding ${doc._id})`,
        );

        if (!dryRun) {
          const now = new Date();
          await engagementsColl.insertOne({
            clientId: doc.clientId,
            serviceId,
            sourceOnboardingId: doc._id,
            status: "approved",
            requestedAt: doc.submittedAt ?? now,
            approvedAt: doc.review?.reviewedAt ?? now,
            activatedAt: null,
            pausedAt: null,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          });
        }
        created++;
      }
    }

    console.log(`\nSummary: ${created} ${dryRun ? "would be created" : "created"}, ${alreadyLive} already had a live engagement.`);
    console.log(`Service ids seen: ${[...knownServiceIdsSeen].join(", ") || "(none)"}`);
    if (dryRun) console.log("\nRe-run without --dry-run to apply.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
