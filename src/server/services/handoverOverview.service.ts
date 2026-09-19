import "server-only";
import { ObjectId } from "mongodb";
import * as assignmentsRepo from "@/server/repositories/serviceAssignments.repo";
import * as handoversRepo from "@/server/repositories/assignmentHandovers.repo";
import * as usersRepo from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import * as onboardingRepo from "@/server/repositories/onboarding.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import { getServiceById } from "@/shared/config/services";
import type {
  PendingHandoverStaffRow,
  HandoverSummary,
  CompletedHandoverRow,
} from "@/shared/types/handoverOverview";

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name ?? user.email;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Stage 1 Phase 28 §29/§30 — every currently-live service engagement
// across every client that has no occupying assignment at all (not even
// one stuck mid-handover) — a genuinely different question from
// "handover pending," which only ever counts services that WERE assigned
// and then lost their owner. A service selected at onboarding and never
// assigned to anyone yet falls only into this count.
async function countUnassignedActiveServices(): Promise<number> {
  const [engagements, liveAssignments] = await Promise.all([
    serviceEngagementsRepo.listAllLive(),
    assignmentsRepo.findAllLive(),
  ]);
  const assignedSlots = new Set(liveAssignments.map((a) => `${a.clientId.toHexString()}:${a.serviceId}`));
  return engagements.filter((e) => !assignedSlots.has(`${e.clientId.toHexString()}:${e.serviceId}`)).length;
}

// The handover dashboard's real, backend-derived numbers (Phase 5 §4) —
// every figure here comes from an actual query, never a placeholder.
export async function getHandoverSummary(): Promise<HandoverSummary> {
  const [pending, completedCount, unassignedActiveServiceCount] = await Promise.all([
    assignmentsRepo.findAllHandoverRequired(),
    handoversRepo.countAllCompleted(),
    countUnassignedActiveServices(),
  ]);

  return {
    pendingStaffCount: new Set(pending.map((a) => a.staffUserId.toHexString())).size,
    pendingAssignmentCount: pending.length,
    affectedServiceCount: new Set(pending.map((a) => a.serviceId)).size,
    affectedClientCount: new Set(pending.map((a) => a.onboardingId.toHexString())).size,
    completedHandoverCount: completedCount,
    unassignedActiveServiceCount,
  };
}

// One row per staff member currently unable to continue active work —
// including one whose handover is already fully complete (Phase 5 §18),
// so the admin can see it went to zero rather than the case simply
// vanishing with no confirmation. A staff member with neither a pending
// nor a past transfer (marked unavailable but never actually held any
// assignment — Phase 5 §19) is left out entirely: there is nothing to
// review for them.
export async function listPendingHandoverStaff(): Promise<PendingHandoverStaffRow[]> {
  // Not just role:"staff" users marked unavailable — also anyone who owns
  // a still-open handover_required assignment for any other reason (e.g.
  // their role was changed away from "staff" while they held active work;
  // see adminUsers.service.ts's updateUserRole for why that cascades the
  // same way blocking does). Found during Phase 6 QA: without this union,
  // that case cascaded correctly but then fell out of this dashboard
  // entirely, undercounting against the summary tiles' org-wide total.
  const [unavailableStaff, openHandovers] = await Promise.all([
    usersRepo.listUnavailableStaff(),
    assignmentsRepo.findAllHandoverRequired(),
  ]);
  const knownIds = new Set(unavailableStaff.map((s) => s._id.toHexString()));
  const otherIds = [...new Set(openHandovers.map((a) => a.staffUserId.toHexString()))].filter(
    (id) => !knownIds.has(id),
  );
  const otherDocs = await Promise.all(otherIds.map((id) => usersRepo.findById(id)));
  const staffDocs = [...unavailableStaff, ...otherDocs.filter((d) => d !== null)];
  if (staffDocs.length === 0) return [];

  const rows = await Promise.all(
    staffDocs.map(async (staff) => {
      const [pending, transferredCount] = await Promise.all([
        assignmentsRepo.findHandoverRequiredByStaff(staff._id),
        handoversRepo.countCompletedByFromStaff(staff._id),
      ]);

      const earliest = pending.reduce<Date | null>((min, a) => {
        if (!a.handoverRequiredAt) return min;
        return !min || a.handoverRequiredAt < min ? a.handoverRequiredAt : min;
      }, null);

      return {
        staffUserId: staff._id.toHexString(),
        name: displayName(staff),
        email: staff.email,
        status: staff.status ?? "active",
        availability: staff.availability ?? "available",
        pendingCount: pending.length,
        transferredCount,
        handoverComplete: pending.length === 0 && transferredCount > 0,
        earliestHandoverRequiredAt: earliest?.toISOString() ?? null,
      };
    }),
  );

  return rows
    .filter((r) => r.pendingCount > 0 || r.transferredCount > 0)
    .sort((a, b) => {
      // Needs-attention cases first (pending > 0), oldest first within
      // that group; fully-handled cases after.
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      return (a.earliestHandoverRequiredAt ?? "").localeCompare(b.earliestHandoverRequiredAt ?? "");
    });
}

export async function listCompletedHandoversForAdmin(params: {
  q?: string;
  serviceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ records: CompletedHandoverRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page ?? 1, 1);

  const trimmedQ = params.q?.trim();
  let searchStaffIds: ObjectId[] | undefined;
  let searchOnboardingIds: ObjectId[] | undefined;

  if (trimmedQ) {
    [searchStaffIds, searchOnboardingIds] = await Promise.all([
      usersRepo.searchStaffIds(trimmedQ),
      onboardingRepo.searchIdsByCompanyName(trimmedQ),
    ]);
  }

  const { records, total } = await handoversRepo.listAllCompleted(
    {
      serviceId: params.serviceId,
      from: params.from && !Number.isNaN(Date.parse(params.from)) ? new Date(params.from) : undefined,
      to:
        params.to && !Number.isNaN(Date.parse(params.to))
          ? new Date(new Date(params.to).setHours(23, 59, 59, 999))
          : undefined,
      searchStaffIds,
      searchOnboardingIds,
    },
    { skip: (page - 1) * pageSize, limit: pageSize },
  );

  if (records.length === 0) return { records: [], total, page, pageSize };

  const staffIds = [
    ...new Set(records.flatMap((r) => [r.fromStaffUserId.toHexString(), r.toStaffUserId?.toHexString(), r.initiatedByUserId.toHexString()])),
  ].filter((id): id is string => Boolean(id));
  const staffDocs = await Promise.all(staffIds.map((id) => usersRepo.findById(id)));
  const staffById = new Map(staffDocs.filter((d) => d !== null).map((d) => [d._id.toHexString(), d]));

  const onboardingIds = [...new Set(records.map((r) => r.onboardingId.toHexString()))];
  const onboardingDocs = await Promise.all(onboardingIds.map((id) => onboardingRepo.findById(new ObjectId(id))));
  const companyNameById = new Map(
    onboardingDocs
      .filter((d) => d !== null)
      .map((d) => [d._id.toHexString(), (d.company as { name?: string } | null)?.name ?? "(company name not set)"]),
  );

  const rows: CompletedHandoverRow[] = records.map((r) => {
    const fromStaff = staffById.get(r.fromStaffUserId.toHexString());
    const toStaff = r.toStaffUserId ? staffById.get(r.toStaffUserId.toHexString()) : undefined;
    const admin = staffById.get(r.initiatedByUserId.toHexString());
    return {
      id: r._id.toHexString(),
      clientCompanyName: companyNameById.get(r.onboardingId.toHexString()) ?? "(company name not set)",
      serviceId: r.serviceId,
      serviceLabel: getServiceById(r.serviceId)?.label ?? r.serviceId,
      previousStaffName: fromStaff ? displayName(fromStaff) : "(former staff member)",
      newStaffName: toStaff ? displayName(toStaff) : "(former staff member)",
      transferredByName: admin ? displayName(admin) : "(unknown admin)",
      transferredAt: (r.completedAt ?? r.initiatedAt).toISOString(),
      reason: r.reason,
    };
  });

  return { records: rows, total, page, pageSize };
}
