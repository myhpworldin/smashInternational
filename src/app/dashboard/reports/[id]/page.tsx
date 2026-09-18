import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getReportForClient } from "@/server/services/reports.service";
import { REPORT_TYPE_LABEL, REPORT_STATUS_LABEL } from "@/shared/types/report";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import DataTimestamp from "@/components/client/DataTimestamp";
import EmptyState from "@/components/client/EmptyState";
import KpiCard from "@/components/client/KpiCard";
import TrendChart from "@/components/client/TrendChart";
import LeadFunnel from "@/components/client/LeadFunnel";
import CampaignPerformanceTable from "@/components/client/CampaignPerformanceTable";
import ProjectCard from "@/components/client/ProjectCard";
import MilestoneList from "@/components/client/MilestoneList";
import DeliverablesList from "@/components/client/DeliverablesList";
import ReportReviewControl from "@/components/client/ReportReviewControl";
import PrintReportButton from "@/components/client/PrintReportButton";
import { formatDateTime } from "@/lib/format/date";
import { formatINR } from "@/lib/format/currency";
import type { PerformanceMetrics } from "@/shared/types/performance";

const KPI_ORDER: (keyof PerformanceMetrics)[] = ["leads", "calls", "qualifiedLeads", "closedDeals", "revenue", "spend"];

// Stage 1 Phase 11 §7/§19/§23 — ownership enforced by getReportForClient
// itself (same pattern as every other client detail page this session):
// a report id that exists but belongs to another client 404s the same as
// one that doesn't exist. Every section below is independently optional
// and shows its own empty state — a report missing one section (e.g. a
// campaign report with no project data) never breaks the rest of the page.
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const report = await getReportForClient(id, doc.clientId);
  if (!report) notFound();

  const kpis = report.performance ? KPI_ORDER.filter((key) => report.performance!.metrics[key] !== undefined) : [];

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow={REPORT_TYPE_LABEL[report.type]}
        title={report.title}
        action={<ClientStatusBadge label={REPORT_STATUS_LABEL[report.status]} tone="positive" />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-carbon pb-6">
        <div className="flex flex-col gap-1">
          <span className="font-body text-sm text-bone">Reporting period: {report.period.label}</span>
          {report.generatedAt && (
            <span className="font-body text-xs text-ash">Generated {formatDateTime(report.generatedAt)}</span>
          )}
          <DataTimestamp reportingDate={null} updatedAt={report.updatedAt} />
        </div>
        <div className="flex gap-2">
          <ReportReviewControl />
          <PrintReportButton />
        </div>
      </div>

      <ClientSection title="Executive Summary">
        {report.executiveSummary ? (
          <p className="font-body text-sm text-bone">{report.executiveSummary}</p>
        ) : (
          <EmptyState message="No executive summary available for this report." />
        )}
      </ClientSection>

      <ClientSection title="Objectives">
        {report.objectives.length === 0 ? (
          <EmptyState message="No objectives recorded for this period." />
        ) : (
          <ul className="flex flex-col gap-1 font-body text-sm text-bone">
            {report.objectives.map((o) => (
              <li key={o}>
                <span className="text-smash-text">✓</span> {o}
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      <ClientSection title="Performance">
        {report.performance ? (
          <div className="flex flex-col gap-6">
            {kpis.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {kpis.map((key) => (
                  <KpiCard key={key} metric={key} value={report.performance!.metrics[key] as number} />
                ))}
              </div>
            )}
            <TrendChart points={report.performance.trend} label="Performance" />
            <LeadFunnel metrics={report.performance.metrics} />
          </div>
        ) : (
          <EmptyState message="No performance data available for this report." />
        )}
      </ClientSection>

      <ClientSection title="Campaign Results">
        <CampaignPerformanceTable rows={report.performance?.campaigns ?? []} />
      </ClientSection>

      <ClientSection title="Project Analysis">
        {report.project ? (
          <div className="flex flex-col gap-4">
            <ProjectCard project={report.project} />
            <MilestoneList milestones={report.project.milestones} />
            <DeliverablesList deliverables={report.project.deliverables} />
          </div>
        ) : (
          <EmptyState message="No project activity available for this report." />
        )}
      </ClientSection>

      <ClientSection title="Budget">
        {report.budget ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col border border-carbon p-4">
              <span className="font-body text-xs text-ash uppercase">Total Budget</span>
              <span className="font-display text-lg text-bone">{formatINR(report.budget.monthlyTotal)}</span>
            </div>
            {report.budget.allocated !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Allocated</span>
                <span className="font-display text-lg text-bone">{formatINR(report.budget.allocated)}</span>
              </div>
            )}
            {report.budget.spent !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Spent</span>
                <span className="font-display text-lg text-bone">{formatINR(report.budget.spent)}</span>
              </div>
            )}
            {report.budget.remaining !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Remaining</span>
                <span className="font-display text-lg text-bone">{formatINR(report.budget.remaining)}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState message="Budget information will appear here once available." />
        )}
      </ClientSection>

      <ClientSection title="Optimization & Key Actions">
        {report.optimizationNotes.length === 0 ? (
          <EmptyState message="No optimization notes for this period." />
        ) : (
          <ul className="flex flex-col gap-1 font-body text-sm text-bone">
            {report.optimizationNotes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </ClientSection>

      <ClientSection title="Next Month Plan">
        {report.nextMonthPlan.length === 0 ? (
          <EmptyState message="No plan has been published for next month yet." />
        ) : (
          <ul className="flex flex-col gap-1 font-body text-sm text-bone">
            {report.nextMonthPlan.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        )}
      </ClientSection>
    </div>
  );
}
