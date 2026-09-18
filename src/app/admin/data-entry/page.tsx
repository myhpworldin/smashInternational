import { requireRole } from "@/server/auth/dal";
import { listForAdmin } from "@/server/services/onboarding.service";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import { listCampaignsForClient } from "@/server/services/campaigns.service";
import { listDailyRecordsForClient } from "@/server/services/dailyRecords.service";
import { getServiceById } from "@/shared/config/services";
import DailyDataEntryClient, { type ClientDataEntryOption } from "@/components/admin/DailyDataEntryClient";
import type { CompanyInput } from "@/shared/validation/onboarding";

// Stage 1 Phase 14 — the cross-client daily data-entry workspace. Fetches
// every approved client's engagements/projects/campaigns/daily-records
// upfront and hands the whole snapshot to one interactive client
// component, rather than adding new API routes for each cascading
// selection (§31: no new backend routes this phase). Fine at today's
// scale (a handful of approved clients, everything still empty since no
// backend exists) — a later phase should paginate/lazy-fetch per
// selection once real client/record volume exists.
export default async function AdminDataEntryPage() {
  await requireRole("admin");

  const { records } = await listForAdmin({ status: "approved", pageSize: 100 });

  const clientOptions: ClientDataEntryOption[] = await Promise.all(
    records.map(async (doc) => {
      const clientIdHex = doc.clientId.toHexString();
      const company = doc.company as Partial<CompanyInput> | null;
      const [engagements, projects, campaigns, dailyRecords] = await Promise.all([
        listEngagementsForClient(doc.clientId),
        listProjectsForClient(doc.clientId),
        listCampaignsForClient(doc.clientId),
        listDailyRecordsForClient(doc.clientId),
      ]);

      return {
        clientId: clientIdHex,
        companyName: company?.name ?? "(no company name)",
        contactPerson: company?.contactPerson,
        services: engagements.map((e) => ({
          id: e.serviceId,
          label: e.serviceLabel,
          category: getServiceById(e.serviceId)?.category ?? "digital_marketing",
        })),
        projects,
        campaigns,
        dailyRecords,
      };
    }),
  );

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl text-bone">Daily Data Entry</h1>
        <p className="font-body text-sm text-ash">
          Enter or update the client, service and campaign/project data shown in the client portal.
        </p>
      </div>

      {clientOptions.length === 0 ? (
        <p className="font-body text-sm text-ash">No approved clients yet.</p>
      ) : (
        <DailyDataEntryClient clients={clientOptions} />
      )}
    </main>
  );
}
