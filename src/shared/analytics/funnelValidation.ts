import type { PerformanceMetrics } from "@/shared/types/performance";

// Stage 1 Phase 20 §6 — hard logical impossibilities only. The funnel is
// deliberately NOT required to be strictly monotonic end-to-end (e.g. an
// appointment can be booked from a lead who was never separately marked
// "qualified" under some services' workflows), so only the relationships
// listed here are ever rejected; anything else is legitimate business
// variance the backend must not silently "fix" by clamping or dropping
// data (§6's own "never silently modify entered business data").
export function validateFunnelMetrics(metrics: Partial<PerformanceMetrics>): string[] {
  const errors: string[] = [];

  if (metrics.qualifiedLeads !== undefined && metrics.leads !== undefined && metrics.qualifiedLeads > metrics.leads) {
    errors.push("Qualified leads cannot exceed total leads.");
  }
  if (metrics.closedDeals !== undefined && metrics.proposals !== undefined && metrics.closedDeals > metrics.proposals) {
    errors.push("Closed deals cannot exceed proposals.");
  }
  if (
    metrics.appointments !== undefined &&
    metrics.qualifiedLeads !== undefined &&
    metrics.appointments > metrics.qualifiedLeads
  ) {
    errors.push("Appointments cannot exceed qualified leads.");
  }
  if (metrics.connectedCalls !== undefined && metrics.calls !== undefined && metrics.connectedCalls > metrics.calls) {
    errors.push("Connected calls cannot exceed calls attempted.");
  }

  return errors;
}
