import Link from "next/link";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getCurrentUser } from "@/server/auth/dal";
import { buildDashboardData } from "@/server/services/dashboard.service";
import { site } from "@/shared/config/site";
import { formatDateTime } from "@/lib/format/date";
import { formatINR } from "@/lib/format/currency";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ServiceCard from "@/components/client/ServiceCard";
import MetricCard from "@/components/client/MetricCard";
import EmptyState from "@/components/client/EmptyState";
import ActionRequired from "@/components/client/ActionRequired";
import ActivityTimeline from "@/components/client/ActivityTimeline";

const POSITIVE_ACCOUNT_STATUSES = new Set(["active", "approved"]);
const ATTENTION_ACCOUNT_STATUSES = new Set(["action_required"]);

// Stage 1 Phase 7 — the first complete client dashboard frontend. All
// data comes from buildDashboardData (Phase 7 §22's adapter), itself
// composed from the same real, session-scoped sources every other client
// page already trusts (resolveOnboardingIdentity, listEngagementsForClient,
// statusHistoryRepo) — no fixtures, no client-supplied ids. requireRole
// in this route's layout has already guaranteed a real client session.
export default async function ClientDashboardPage() {
  const [{ doc }, user] = await Promise.all([resolveOnboardingIdentity(), getCurrentUser()]);
  const data = await buildDashboardData(doc, { email: user?.email ?? "" });

  const accountTone = POSITIVE_ACCOUNT_STATUSES.has(data.account.status)
    ? "positive"
    : ATTENTION_ACCOUNT_STATUSES.has(data.account.status)
      ? "attention"
      : "neutral";
  const activeServiceCount = data.services.filter((s) => s.status === "active").length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <ClientPageHeader
        eyebrow="Dashboard"
        title={`Welcome back${data.client.companyName ? `, ${data.client.companyName}` : ` to ${site.shortName}`}`}
        description="Here's what's happening with your SMASH account."
        action={<ClientStatusBadge label={data.account.label} tone={accountTone} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Account Status" value={data.account.label} />
        <MetricCard label="Active Services" value={data.services.length > 0 ? String(activeServiceCount) : undefined} />
        <MetricCard label="Active Work" value={String(data.activeWork.length)} />
        <MetricCard
          label="Monthly Budget"
          value={data.budget ? formatINR(data.budget.monthlyTotal) : undefined}
        />
      </div>

      {data.actions.length > 0 && (
        <ClientSection title="Action Required">
          <ActionRequired actions={data.actions} />
        </ClientSection>
      )}

      {data.budgetSnapshot && (
        <ClientSection
          title="Budget"
          action={
            <Link href="/dashboard/budget" className="font-body text-xs text-ash underline hover:text-bone">
              View Budget
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total Budget" value={formatINR(data.budgetSnapshot.total)} />
            <MetricCard label="Spent" value={formatINR(data.budgetSnapshot.spent)} />
            <MetricCard label="Remaining" value={formatINR(data.budgetSnapshot.remaining)} />
          </div>
        </ClientSection>
      )}

      <ClientSection
        title="Pending Approvals"
        action={
          <Link href="/dashboard/approvals" className="font-body text-xs text-ash underline hover:text-bone">
            Review
          </Link>
        }
      >
        {data.pendingApprovalsCount === 0 ? (
          <EmptyState message="No pending approvals." />
        ) : (
          <p className="font-body text-2xl text-bone">{data.pendingApprovalsCount}</p>
        )}
      </ClientSection>

      <ClientSection
        title="Recent Deliverables"
        action={
          <Link href="/dashboard/deliverables" className="font-body text-xs text-ash underline hover:text-bone">
            View Deliverables
          </Link>
        }
      >
        {data.recentDeliverablesCount === 0 ? (
          <EmptyState message="No deliverables yet." />
        ) : (
          <p className="font-body text-2xl text-bone">{data.recentDeliverablesCount} new</p>
        )}
      </ClientSection>

      {/* Under Review / pre-approval: no services exist yet, so this
          section takes the place of the (empty) services list — the
          submitted-services checklist plus a plain-language explanation
          of what happens next (Phase 7 §8). */}
      {data.services.length === 0 && data.account.status !== "onboarding" && (
        <ClientSection title="Onboarding">
          <div className="flex flex-col gap-3 border border-carbon p-5">
            {data.account.status === "under_review" ? (
              <>
                <p className="font-body text-sm text-bone">
                  Your information has been submitted to the SMASH team and is currently being reviewed.
                </p>
                {data.onboarding.submittedAt && (
                  <p className="font-body text-xs text-ash">Submitted {formatDateTime(data.onboarding.submittedAt)}</p>
                )}
              </>
            ) : data.account.status === "approved" ? (
              <p className="font-body text-sm text-bone">
                Your onboarding has been approved. The SMASH team is preparing your selected services.
              </p>
            ) : (
              <p className="font-body text-sm text-bone">{data.onboarding.reviewNotes}</p>
            )}
            {data.onboarding.selectedServiceLabels.length > 0 && (
              <ul className="flex flex-col gap-0.5 font-body text-sm text-bone">
                {data.onboarding.selectedServiceLabels.map((label) => (
                  <li key={label}>
                    <span className="text-smash-text">✓</span> {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ClientSection>
      )}

      {data.account.status === "onboarding" && (
        <ClientSection title="Onboarding">
          <div className="flex flex-col gap-3 border border-carbon p-5">
            <p className="font-body text-sm text-bone">You haven&apos;t finished onboarding yet.</p>
            <Link
              href="/onboarding"
              className="self-start rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
            >
              Continue onboarding
            </Link>
          </div>
        </ClientSection>
      )}

      {data.services.length > 0 && (
        <ClientSection
          title="My Services"
          action={
            <Link href="/dashboard/services" className="font-body text-xs text-ash underline hover:text-bone">
              View all
            </Link>
          }
        >
          <ul className="flex flex-col gap-2">
            {data.services.map((e) => (
              <li key={e.id}>
                <ServiceCard engagement={e} />
              </li>
            ))}
          </ul>
        </ClientSection>
      )}

      <ClientSection
        title="Campaigns & Projects"
        action={
          <div className="flex gap-3">
            <Link href="/dashboard/projects" className="font-body text-xs text-ash underline hover:text-bone">
              Projects
            </Link>
            <Link href="/dashboard/campaigns" className="font-body text-xs text-ash underline hover:text-bone">
              Campaigns
            </Link>
          </div>
        }
      >
        {data.activeWork.length === 0 ? (
          <EmptyState message="No active campaigns or projects yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.activeWork.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/dashboard/${item.kind === "project" ? "projects" : "campaigns"}/${item.id}`}
                  className="flex items-center justify-between border border-carbon px-3 py-2 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
                >
                  <span className="font-body text-sm text-bone">{item.name}</span>
                  <span className="font-body text-xs text-ash">{item.service}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      <ClientSection
        title="Performance"
        action={
          <Link href="/dashboard/performance" className="font-body text-xs text-ash underline hover:text-bone">
            View all
          </Link>
        }
      >
        <EmptyState message="Performance data will appear here once campaign/service activity begins." />
      </ClientSection>

      <ClientSection title="Recent Activity">
        <ActivityTimeline items={data.activity} />
      </ClientSection>
    </div>
  );
}
