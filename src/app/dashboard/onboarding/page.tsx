import Link from "next/link";
import { resolveOnboardingIdentity, listAssets } from "@/server/services/onboarding.service";
import { ONBOARDING_CLIENT_LABEL, BUSINESS_OBJECTIVES, ASSET_TYPES } from "@/shared/types/onboarding";
import { getServiceById } from "@/shared/config/services";
import { formatDateTime } from "@/lib/format/date";
import { formatINR } from "@/lib/format/currency";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import EmptyState from "@/components/client/EmptyState";
// Reused as-is (Phase 8 §26/§27) — see the identical reuse note on the
// service-detail page; this is the client's own submitted data.
import AdminServiceRequirements from "@/components/admin/AdminServiceRequirements";
import type { CompanyInput, TargetAudienceInput, BudgetInput } from "@/shared/validation/onboarding";

const STATUS_TONE: Record<string, "positive" | "attention" | "neutral"> = {
  approved: "positive",
  changes_requested: "attention",
};

const STATUS_EXPLANATION: Record<string, string> = {
  draft: "You haven't submitted your onboarding information yet.",
  submitted: "Your information has been submitted to the SMASH team and is currently being reviewed.",
  under_review: "The SMASH team is actively reviewing your information.",
  changes_requested: "SMASH has requested some changes before your onboarding can be approved.",
  approved: "Your onboarding has been approved. SMASH is preparing your selected services.",
};

// Stage 1 Phase 8 — a dedicated, read-only "what did I submit and where
// does it stand" view. Deliberately a new page (not the existing
// /onboarding route, which stays exactly what it was: the editable wizard
// for draft/changes_requested, and the transient just-submitted status
// screen with its countdown into the dashboard). This page is always
// reachable from the portal nav regardless of onboarding progress, and
// never edits anything — the wizard remains the only write path.
export default async function MyOnboardingPage() {
  const { doc } = await resolveOnboardingIdentity();
  const company = doc.company as Partial<CompanyInput> | null;
  const targetAudience = doc.targetAudience as Partial<TargetAudienceInput> | null;
  const budget = doc.budget as Partial<BudgetInput> | null;
  const assets = await listAssets(doc._id);

  const services = doc.selectedServiceIds.map((id) => getServiceById(id)).filter((s) => s !== undefined);
  const primaryObjective = (doc.objectives as { selected?: string[] } | null)?.selected?.[0];
  const primaryObjectiveLabel = primaryObjective
    ? (BUSINESS_OBJECTIVES.find((o) => o.id === primaryObjective)?.label ?? primaryObjective)
    : undefined;

  const assetCountByType = new Map<string, number>();
  for (const asset of assets) {
    assetCountByType.set(asset.assetType, (assetCountByType.get(asset.assetType) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow="My Business"
        title="My Onboarding"
        action={<ClientStatusBadge label={ONBOARDING_CLIENT_LABEL[doc.status]} tone={STATUS_TONE[doc.status] ?? "neutral"} />}
      />

      {doc.createdByUserId && (
        <p className="font-body text-xs text-ash">
          Your onboarding was completed with assistance from the SMASH team.
        </p>
      )}

      <ClientSection title="Status">
        <div className="flex flex-col gap-2 border border-carbon p-5">
          <p className="font-body text-sm text-bone">{STATUS_EXPLANATION[doc.status]}</p>
          {doc.status === "changes_requested" && doc.review.notes && (
            <p className="font-body text-sm text-ash">Reason: {doc.review.notes}</p>
          )}
          {doc.submittedAt && (
            <p className="font-body text-xs text-ash">Submitted {formatDateTime(doc.submittedAt.toISOString())}</p>
          )}
          {doc.status === "changes_requested" && (
            <Link
              href="/onboarding"
              className="self-start rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
            >
              Review changes
            </Link>
          )}
        </div>
      </ClientSection>

      <ClientSection title="Onboarding summary">
        <FieldGrid>
          <Field label="Company" value={company?.name} />
          <Field label="Services" value={services.length > 0 ? String(services.length) : undefined} />
          <Field label="Primary objective" value={primaryObjectiveLabel} />
          <Field label="Target location" value={targetAudience?.locations?.join(", ")} />
          {budget?.monthlyTotal && <Field label="Monthly budget" value={formatINR(budget.monthlyTotal)} />}
        </FieldGrid>
      </ClientSection>

      <ClientSection title="Selected services">
        {services.length === 0 ? (
          <EmptyState message="No services selected." />
        ) : (
          <ul className="flex flex-col gap-1 font-body text-sm text-bone">
            {services.map((s) => (
              <li key={s!.id}>
                <span className="text-smash-text">✓</span> {s!.label}
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      <ClientSection title="Service requirements">
        <AdminServiceRequirements
          selectedServiceIds={doc.selectedServiceIds}
          serviceResponses={doc.serviceResponses}
        />
      </ClientSection>

      {budget?.monthlyTotal ? (
        <ClientSection title="Onboarding budget">
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs text-ash">
              This is the budget you planned during onboarding, not actual campaign spend.
            </p>
            <FieldGrid>
              <Field label="Planned monthly budget" value={formatINR(budget.monthlyTotal)} />
            </FieldGrid>
            {budget.allocations && budget.allocations.length > 0 && (
              <ul className="flex flex-col gap-1 font-body text-sm text-bone">
                {budget.allocations.map((a) => (
                  <li key={a.channel} className="flex items-center justify-between border border-carbon px-3 py-2">
                    <span>{a.channel} allocation</span>
                    <span className="text-ash">{formatINR(a.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ClientSection>
      ) : null}

      <ClientSection
        title="Assets"
        action={
          <Link href="/dashboard/documents" className="font-body text-xs text-ash underline hover:text-bone">
            View all
          </Link>
        }
      >
        {assets.length === 0 ? (
          <EmptyState message="No assets uploaded." />
        ) : (
          <ul className="flex flex-col gap-1 font-body text-sm text-bone">
            {ASSET_TYPES.filter((t) => assetCountByType.has(t.id)).map((t) => (
              <li key={t.id} className="flex items-center justify-between border border-carbon px-3 py-2">
                <span>{t.label}</span>
                <span className="text-ash">
                  {assetCountByType.get(t.id) === 1 ? "✓ Uploaded" : `${assetCountByType.get(t.id)} files`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ClientSection>
    </div>
  );
}
