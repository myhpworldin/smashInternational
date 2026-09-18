import "server-only";
import { ObjectId } from "mongodb";
import * as dailyRecordsRepo from "@/server/repositories/dailyPerformanceRecords.repo";
import type { DailyPerformanceRecordDoc } from "@/server/repositories/dailyPerformanceRecords.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as projectsRepo from "@/server/repositories/projects.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import { getMetricGroup } from "@/lib/performance/metricGroups";
import { validateFunnelMetrics } from "@/shared/analytics/funnelValidation";
import { getServiceById } from "@/shared/config/services";
import type { PerformanceMetrics } from "@/shared/types/performance";
import type { DailyPerformanceRecord, DailyProjectProgress } from "@/shared/types/dailyRecord";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 19 — real persistence, replacing the Phase 14 stub (which
// always returned []). Keeps the exact DailyPerformanceRecord shape the
// Phase 14 admin data-entry UI and Phase 10 client performance UI already
// consume — no component needs to change for this phase to take effect.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const PROJECT_CATEGORIES = ["creative", "technology"];

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name?.trim() || user.email;
}

function toClientRecord(doc: DailyPerformanceRecordDoc): DailyPerformanceRecord {
  return {
    id: doc._id.toHexString(),
    clientId: doc.clientId.toHexString(),
    serviceId: doc.serviceId,
    serviceLabel: getServiceById(doc.serviceId)?.label ?? doc.serviceId,
    campaignOrProjectId: doc.campaignOrProjectId ? doc.campaignOrProjectId.toHexString() : undefined,
    campaignOrProjectLabel: doc.campaignOrProjectLabel ?? undefined,
    reportingDate: doc.reportingDate,
    metrics: doc.metrics,
    projectProgress: doc.projectProgress ?? undefined,
    notes: doc.notes ?? undefined,
    source: doc.source,
    updatedAt: doc.updatedAt.toISOString(),
    updatedByName: doc.updatedByName,
  };
}

export async function listDailyRecordsForClient(clientId: ObjectId): Promise<DailyPerformanceRecord[]> {
  const docs = await dailyRecordsRepo.listByClientId(clientId);
  return docs.map(toClientRecord);
}

// The one write path (§12/§26): create-or-update-in-place on the natural
// key (client + service + campaign/project + reportingDate), preceded by
// full server-side relationship validation — every id is re-checked
// against the database, never trusted as-supplied (§11/§30/§37), and
// metrics are checked against the service's actual metric group so an
// admin can't accidentally save a field that doesn't apply to it
// (§18/§33's invalid-metrics rejection).
export async function saveDailyRecordForAdmin(
  input: {
    clientId: ObjectId;
    serviceId: string;
    campaignOrProjectId: ObjectId | null;
    reportingDate: string;
    metrics?: Partial<Record<string, number>>;
    projectProgress?: Partial<DailyProjectProgress> | null;
    notes?: string;
  },
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<DailyPerformanceRecord>> {
  const service = getServiceById(input.serviceId);
  if (!service) {
    return { ok: false, errors: ["Unknown service."] };
  }

  const engagement = await serviceEngagementsRepo.findLiveByClientAndService(input.clientId, input.serviceId);
  if (!engagement) {
    return { ok: false, errors: ["This service is not active for this client."] };
  }

  const isProjectBased = PROJECT_CATEGORIES.includes(service.category);
  let campaignOrProjectLabel: string | null = null;

  if (input.campaignOrProjectId) {
    if (isProjectBased) {
      const project = await projectsRepo.findById(input.campaignOrProjectId);
      if (!project || !project.clientId.equals(input.clientId) || project.serviceId !== input.serviceId) {
        return { ok: false, errors: ["Project not found for this client/service."] };
      }
      campaignOrProjectLabel = project.name;
    } else {
      const campaign = await campaignsRepo.findById(input.campaignOrProjectId);
      if (!campaign || !campaign.clientId.equals(input.clientId) || campaign.serviceId !== input.serviceId) {
        return { ok: false, errors: ["Campaign not found for this client/service."] };
      }
      campaignOrProjectLabel = campaign.name;
    }
  }

  const metrics: PerformanceMetrics = {};
  let projectProgress: DailyProjectProgress | null = null;

  if (isProjectBased) {
    if (input.projectProgress) {
      const progress = input.projectProgress.overallProgress;
      if (progress !== undefined && (progress < 0 || progress > 100)) {
        return { ok: false, errors: ["Progress must be between 0 and 100."] };
      }
      projectProgress = {
        overallProgress: progress,
        status: input.projectProgress.status,
      };
    }
  } else {
    const allowedKeys = new Set(getMetricGroup(input.serviceId, service.category));
    for (const [key, value] of Object.entries(input.metrics ?? {})) {
      if (!allowedKeys.has(key as keyof PerformanceMetrics)) {
        return { ok: false, errors: [`"${key}" is not a valid metric for this service.`] };
      }
      if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return { ok: false, errors: [`"${key}" must be a non-negative number.`] };
      }
      metrics[key as keyof PerformanceMetrics] = value;
    }

    const funnelErrors = validateFunnelMetrics(metrics);
    if (funnelErrors.length > 0) {
      return { ok: false, errors: funnelErrors };
    }
  }

  const doc = await dailyRecordsRepo.upsert({
    clientId: input.clientId,
    serviceEngagementId: engagement._id,
    serviceId: input.serviceId,
    campaignOrProjectId: input.campaignOrProjectId,
    campaignOrProjectLabel,
    reportingDate: input.reportingDate,
    metrics,
    projectProgress,
    notes: input.notes?.trim() || null,
    actorUserId: actor._id,
    actorName: displayName(actor),
  });

  return { ok: true, data: toClientRecord(doc) };
}
