import "server-only";
import type { PeriodKey } from "@/shared/analytics/period";

const VALID_PERIOD_KEYS: PeriodKey[] = [
  "today",
  "yesterday",
  "last_7_days",
  "current_week",
  "previous_week",
  "current_month",
  "previous_month",
  "custom",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedPeriodQuery =
  | { ok: true; periodKey: PeriodKey; custom?: { start: string; end: string } }
  | { ok: false; error: string };

// Stage 1 Phase 20 §39/§56 — shared request-parsing for every analytics
// route's `period`/`start`/`end` query params, so "invalid date range" is
// rejected identically (a 400 with a clear message) everywhere rather
// than each route re-validating slightly differently.
export function parsePeriodQuery(searchParams: URLSearchParams): ParsedPeriodQuery {
  const periodParam = searchParams.get("period") ?? "current_month";
  if (!VALID_PERIOD_KEYS.includes(periodParam as PeriodKey)) {
    return { ok: false, error: `Invalid period. Expected one of: ${VALID_PERIOD_KEYS.join(", ")}.` };
  }
  const periodKey = periodParam as PeriodKey;

  if (periodKey !== "custom") {
    return { ok: true, periodKey };
  }

  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end || !DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) {
    return { ok: false, error: "Custom period requires start and end query params in YYYY-MM-DD format." };
  }
  if (start > end) {
    return { ok: false, error: "Custom period start date must not be after its end date." };
  }
  return { ok: true, periodKey, custom: { start, end } };
}
