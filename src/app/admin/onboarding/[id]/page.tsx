import Link from "next/link";
import { ObjectId } from "mongodb";
import { requireRole } from "@/server/auth/dal";
import { getForAdmin, listAssets, getOnboardingStatusHistory } from "@/server/services/onboarding.service";
import { ONBOARDING_ADMIN_LABEL, BUSINESS_OBJECTIVES } from "@/shared/types/onboarding";
import { getServiceById } from "@/shared/config/services";
import { formatINR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import AdminServiceRequirements from "@/components/admin/AdminServiceRequirements";
import AdminAssetsList from "@/components/admin/AdminAssetsList";
import AdminReviewActions from "@/components/admin/AdminReviewActions";
import AssignmentsPanel from "@/components/admin/AssignmentsPanel";
import ServiceEngagementsPanel from "@/components/admin/ServiceEngagementsPanel";
import { listAssignmentsForOnboarding } from "@/server/services/serviceAssignments.service";
import { listAssignableStaffForAdmin } from "@/server/services/adminUsers.service";
import { listEngagementsForOnboarding } from "@/server/services/serviceEngagements.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import { listCampaignsForClient } from "@/server/services/campaigns.service";
import { getBudgetForClient, listBudgetRequestsForClient } from "@/server/services/budget.service";
import AdminProjectsPanel from "@/components/admin/AdminProjectsPanel";
import AdminCampaignsPanel from "@/components/admin/AdminCampaignsPanel";
import AdminBudgetPanel from "@/components/admin/AdminBudgetPanel";
import AdminBudgetRequestsPanel from "@/components/admin/AdminBudgetRequestsPanel";
import AdminPerformanceEntryPanel from "@/components/admin/AdminPerformanceEntryPanel";
import { ACCOUNT_MANAGER_SLOT } from "@/shared/types/serviceAssignment";
import type {
  CompanyInput,
  ObjectivesInput,
  TargetAudienceInput,
  BudgetInput,
  BrandProfileInput,
} from "@/shared/validation/onboarding";

const ACTIONABLE_STATUSES = new Set(["submitted", "under_review"]);

export default async function AdminOnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("admin");
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return (
      <main className="px-6 py-10 md:px-10">
        <p className="font-body text-sm text-smash-text">That onboarding record doesn&apos;t exist.</p>
        <Link href="/admin/onboarding" className="mt-2 inline-block font-body text-sm text-ash underline">
          Back to list
        </Link>
      </main>
    );
  }

  const doc = await getForAdmin(new ObjectId(id), new ObjectId(session.userId));
  if (!doc) {
    return (
      <main className="px-6 py-10 md:px-10">
        <p className="font-body text-sm text-smash-text">That onboarding record doesn&apos;t exist.</p>
        <Link href="/admin/onboarding" className="mt-2 inline-block font-body text-sm text-ash underline">
          Back to list
        </Link>
      </main>
    );
  }

  const assets = await listAssets(doc._id);
  const assignments = await listAssignmentsForOnboarding(doc._id.toHexString());
  const assignableStaff = await listAssignableStaffForAdmin();
  const engagements = await listEngagementsForOnboarding(doc._id);
  const statusHistory = await getOnboardingStatusHistory(doc._id);
  // Stage 1 Phase 13 — the same client-facing adapters the client portal
  // itself reads from (Phase 9/12), reused here rather than duplicated:
  // whatever an admin eventually saves through these new panels is
  // exactly what the client's own pages would show, by construction.
  const [clientProjects, clientCampaigns, budgetSnapshot, budgetRequests] = await Promise.all([
    listProjectsForClient(doc.clientId),
    listCampaignsForClient(doc.clientId),
    getBudgetForClient(doc.clientId),
    listBudgetRequestsForClient(doc.clientId),
  ]);
  const engagedServiceOptions = engagements.map((e) => ({
    id: e.serviceId,
    label: e.serviceLabel,
    engagementId: e.id,
  }));

  const company = doc.company as Partial<CompanyInput> | null;
  const objectives = doc.objectives as Partial<ObjectivesInput> | null;
  const targetAudience = doc.targetAudience as Partial<TargetAudienceInput> | null;
  const budget = doc.budget as Partial<BudgetInput> | null;
  const brandProfile = doc.brandProfile as Partial<BrandProfileInput> | null;
  const services = doc.selectedServiceIds.map((sid) => getServiceById(sid)).filter((s) => s !== undefined);

  return (
    <main className="flex flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1">
        <Link href="/admin/onboarding" className="font-body text-xs text-ash underline hover:text-bone">
          ← Back to list
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-xl text-bone">{company?.name ?? "(no company name yet)"}</h1>
          <span className="border border-carbon bg-carbon px-3 py-1 font-body text-xs text-bone uppercase">
            {ONBOARDING_ADMIN_LABEL[doc.status]}
          </span>
        </div>
      </div>

      <Section title="Company information">
        <FieldGrid>
          <Field label="Company name" value={company?.name} />
          <Field label="Industry" value={company?.industry} />
          <Field label="Business description" value={company?.description} />
          <Field label="Website" value={company?.website} />
          <Field label="Business locations" value={company?.locations?.join(", ")} />
          <Field label="Contact person" value={company?.contactPerson} />
          <Field label="Designation" value={company?.designation} />
          <Field label="Email" value={company?.email} />
          <Field label="Phone" value={company?.phone} />
          <Field label="WhatsApp" value={company?.whatsapp} />
        </FieldGrid>
      </Section>

      <Section title="Business objectives">
        <FieldGrid>
          <Field
            label="Objectives"
            value={objectives?.selected
              ?.map((o) => BUSINESS_OBJECTIVES.find((b) => b.id === o)?.label ?? o)
              .join(", ")}
          />
          {objectives?.otherDetail && <Field label="Other detail" value={objectives.otherDetail} />}
        </FieldGrid>
      </Section>

      <Section title="Target audience">
        <FieldGrid>
          <Field label="Age group" value={targetAudience?.ageGroups?.join(", ")} />
          <Field label="Gender" value={targetAudience?.gender?.join(", ")} />
          <Field label="Location" value={targetAudience?.locations?.join(", ")} />
          <Field label="Customer type" value={targetAudience?.customerType} />
          <Field label="Interests" value={targetAudience?.interests?.join(", ")} />
          <Field label="Existing customer profile" value={targetAudience?.existingCustomerProfile} />
        </FieldGrid>
      </Section>

      <Section title="Selected services">
        {services.length === 0 ? (
          <p className="font-body text-sm text-ash">None selected.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {services.map((s) => (
              <li key={s!.id} className="font-body text-sm text-bone">
                <span className="text-smash-text">✓</span> {s!.label}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Service engagements">
        <ServiceEngagementsPanel initialEngagements={engagements} />
      </Section>

      <Section title="Projects">
        <AdminProjectsPanel
          clientId={doc.clientId.toHexString()}
          serviceOptions={engagedServiceOptions}
          projects={clientProjects}
        />
      </Section>

      <Section title="Campaigns">
        <AdminCampaignsPanel
          clientId={doc.clientId.toHexString()}
          serviceOptions={engagedServiceOptions}
          campaigns={clientCampaigns}
        />
      </Section>

      <Section title="Budget (actual spend)">
        <AdminBudgetPanel clientId={doc.clientId.toHexString()} snapshot={budgetSnapshot} />
      </Section>

      <Section title="Budget requests">
        <AdminBudgetRequestsPanel requests={budgetRequests} />
      </Section>

      <Section title="Performance entry">
        <AdminPerformanceEntryPanel clientId={doc.clientId.toHexString()} serviceOptions={engagedServiceOptions} />
      </Section>

      <Section title="Service assignments">
        <AssignmentsPanel
          onboardingId={doc._id.toHexString()}
          companyName={company?.name ?? "(no company name yet)"}
          services={[
            // Stage 1 Phase 28 §3A/§16 — the account-manager slot reuses
            // this exact assign/reassign/handover UI unchanged; it's just
            // one more entry in the same list, always shown first since
            // the account manager is the client-wide relationship owner,
            // not tied to any one selected service.
            { id: ACCOUNT_MANAGER_SLOT, label: "Account Manager (client-wide)" },
            ...services.map((s) => ({ id: s!.id, label: s!.label })),
          ]}
          initialAssignments={assignments}
          assignableStaff={assignableStaff}
        />
      </Section>

      {brandProfile && (
        <Section title="Brand profile">
          <FieldGrid>
            <Field label="Brand story" value={brandProfile.brandStory} />
            <Field label="Brand positioning" value={brandProfile.brandPositioning} />
            <Field label="Tone of voice" value={brandProfile.toneOfVoice} />
            <Field label="Key products / services" value={brandProfile.keyProductsServices} />
            <Field label="USPs" value={brandProfile.usps} />
            <Field label="Competitors" value={brandProfile.competitors} />
          </FieldGrid>
        </Section>
      )}

      <Section title="Service requirements">
        <AdminServiceRequirements selectedServiceIds={doc.selectedServiceIds} serviceResponses={doc.serviceResponses} />
      </Section>

      <Section title="Assets / documents">
        <AdminAssetsList assets={assets} />
      </Section>

      <Section title="Budget">
        {budget ? (
          <div className="flex flex-col gap-2">
            <FieldGrid>
              <Field label="Monthly total" value={formatINR(budget.monthlyTotal ?? 0)} />
            </FieldGrid>
            {budget.allocations && budget.allocations.length > 0 && (
              <ul className="flex flex-col gap-0.5 font-body text-sm text-bone">
                {budget.allocations.map((a) => (
                  <li key={a.channel}>
                    {a.channel}: {formatINR(a.amount)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="font-body text-sm text-ash">Not applicable — no advertising service selected.</p>
        )}
      </Section>

      <Section title="Submission information">
        <FieldGrid>
          <Field label="Status" value={ONBOARDING_ADMIN_LABEL[doc.status]} />
          <Field label="Submitted" value={doc.submittedAt ? formatDateTime(doc.submittedAt) : "Not submitted"} />
          <Field label="Created" value={formatDateTime(doc.createdAt)} />
          {doc.review.reviewedAt && (
            <>
              <Field label="Reviewed" value={formatDateTime(doc.review.reviewedAt)} />
              <Field label="Reviewed by" value={doc.review.reviewedByEmail ?? "Unknown admin"} />
              <Field label="Decision notes" value={doc.review.notes ?? undefined} />
            </>
          )}
        </FieldGrid>

        {statusHistory.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Status history</p>
            <ul className="flex flex-col gap-1 font-body text-xs text-ash">
              {statusHistory.map((entry) => (
                <li key={entry.id}>
                  {entry.previousStatus ? `${entry.previousStatus} → ${entry.newStatus}` : entry.newStatus} by{" "}
                  <span className="text-bone">{entry.changedByEmail}</span> ({entry.changedByRole}) —{" "}
                  {formatDateTime(entry.changedAt)}
                  {entry.reason ? ` — "${entry.reason}"` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {ACTIONABLE_STATUSES.has(doc.status) && <AdminReviewActions onboardingId={doc._id.toHexString()} />}
    </main>
  );
}

// Each section gets its own top border — spacing alone (the outer flex
// gap) wasn't enough of a boundary; sections read as one continuous block
// with no way to tell where "Target Audience" ends and "Selected Services"
// begins.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/15 pt-6">
      <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{title}</h2>
      {children}
    </section>
  );
}

// Only for sections made up of label/value pairs (Field) — sections with
// one complex child (a list, a grid of asset cards) render that child at
// full width instead, via Section directly.
function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">{children}</div>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="font-body text-xs text-ash">{label}</dt>
      <dd className="font-body text-sm text-bone">{value || "Not provided"}</dd>
    </div>
  );
}
