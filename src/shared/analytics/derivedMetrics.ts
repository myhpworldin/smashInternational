// Stage 1 Phase 20 §12/§13 — the one authoritative place every derived
// rate is calculated, so a client API, an admin API, and a future report
// generator can never silently disagree about what "close rate" means.
//
// Deliberately mirrors performance.ts's existing `safeRatio` convention
// (a falsy numerator or denominator yields `null`, never NaN/Infinity) for
// the plain-ratio case too, rather than inventing a second null-handling
// rule — see safeDivide below.
export function safeDivide(numerator: number | undefined | null, denominator: number | undefined | null): number | null {
  if (!numerator || !denominator) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

function roundTo(value: number | null, decimals: number): number | null {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function safePercent(numerator: number | undefined | null, denominator: number | undefined | null): number | null {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : roundTo(ratio * 100, 1);
}

export function costPerLead(spend?: number | null, leads?: number | null): number | null {
  return roundTo(safeDivide(spend, leads), 2);
}

export function costPerClick(spend?: number | null, clicks?: number | null): number | null {
  return roundTo(safeDivide(spend, clicks), 2);
}

// Stage 1 Phase 21 §5/§6 — "cost per acquisition" needs a conversion
// count as its denominator; this data model has no field separate from
// `closedDeals` that represents a completed acquisition, so closedDeals
// is the acquisition count CPA is calculated against here — documented
// rather than left ambiguous, since a different definition would silently
// change what every CPA figure means.
export function costPerAcquisition(spend?: number | null, closedDeals?: number | null): number | null {
  return roundTo(safeDivide(spend, closedDeals), 2);
}

export function clickThroughRate(clicks?: number | null, impressions?: number | null): number | null {
  return safePercent(clicks, impressions);
}

export function conversionRate(conversions?: number | null, leads?: number | null): number | null {
  return safePercent(conversions, leads);
}

export function qualifiedRate(qualifiedLeads?: number | null, leads?: number | null): number | null {
  return safePercent(qualifiedLeads, leads);
}

export function closeRate(closedDeals?: number | null, leads?: number | null): number | null {
  return safePercent(closedDeals, leads);
}

export function appointmentRate(appointments?: number | null, qualifiedLeads?: number | null): number | null {
  return safePercent(appointments, qualifiedLeads);
}

export function proposalRate(proposals?: number | null, appointments?: number | null): number | null {
  return safePercent(proposals, appointments);
}

export function proposalCloseRate(closedDeals?: number | null, proposals?: number | null): number | null {
  return safePercent(closedDeals, proposals);
}

export function revenuePerClosedDeal(revenue?: number | null, closedDeals?: number | null): number | null {
  return roundTo(safeDivide(revenue, closedDeals), 2);
}

export type PeriodDiff = {
  current: number | null;
  previous: number | null;
  difference: number | null;
  percentChange: number | null;
};

// §15 — never generate a percentage change against a zero/null previous
// value; that's not "infinite growth," it's an undefined comparison.
export function comparePeriodValue(current: number | null, previous: number | null): PeriodDiff {
  const difference = current === null && previous === null ? null : (current ?? 0) - (previous ?? 0);
  const percentChange = previous ? roundTo(((current ?? 0) - previous) / previous * 100, 2) : null;
  return { current, previous, difference, percentChange };
}
