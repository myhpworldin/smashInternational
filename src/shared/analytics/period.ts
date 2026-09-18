// Stage 1 Phase 20 §7/§8/§38 — period resolution operates purely on
// "YYYY-MM-DD" strings, the same reportingDate representation
// dailyPerformanceRecords.repo.ts stores (Phase 19), specifically so no
// Date-object timezone conversion can ever shift a resolved boundary by a
// day. Lexicographic string comparison on this fixed-width format is
// equivalent to chronological comparison, so callers can bound Mongo
// queries with plain $gte/$lte string filters.
export type PeriodKey =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "current_week"
  | "previous_week"
  | "current_month"
  | "previous_month"
  | "custom";

export type ResolvedPeriod = {
  key: PeriodKey;
  startDate: string;
  endDate: string;
  label: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fromDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(s: string, days: number): string {
  const d = fromDateString(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

// Monday-start week, a fixed business convention (not locale-dependent) so
// "current week"/"previous week" resolve identically regardless of server
// locale.
function startOfWeek(s: string): string {
  const d = fromDateString(s);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return toDateString(d);
}

function startOfMonth(s: string): string {
  const [y, m] = s.split("-").map(Number);
  return `${y}-${pad(m)}-01`;
}

function endOfMonth(s: string): string {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of this month
  return toDateString(d);
}

function formatLabel(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

// `today` is injected (defaulting to the real current date) so callers —
// and tests — never depend on the wall clock at call time being observed
// consistently across a single request.
export function resolvePeriod(
  key: PeriodKey,
  options: { today?: string; customStart?: string; customEnd?: string } = {},
): ResolvedPeriod {
  const today = options.today ?? toDateString(new Date());

  switch (key) {
    case "today":
      return { key, startDate: today, endDate: today, label: formatLabel(today, today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { key, startDate: y, endDate: y, label: formatLabel(y, y) };
    }
    case "last_7_days": {
      const start = addDays(today, -6);
      return { key, startDate: start, endDate: today, label: formatLabel(start, today) };
    }
    case "current_week": {
      const start = startOfWeek(today);
      const end = addDays(start, 6);
      return { key, startDate: start, endDate: end, label: formatLabel(start, end) };
    }
    case "previous_week": {
      const currentStart = startOfWeek(today);
      const start = addDays(currentStart, -7);
      const end = addDays(start, 6);
      return { key, startDate: start, endDate: end, label: formatLabel(start, end) };
    }
    case "current_month": {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { key, startDate: start, endDate: end, label: formatLabel(start, end) };
    }
    case "previous_month": {
      const [y, m] = today.split("-").map(Number);
      const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
      const start = toDateString(prevMonthDate);
      const end = endOfMonth(start);
      return { key, startDate: start, endDate: end, label: formatLabel(start, end) };
    }
    case "custom": {
      if (!options.customStart || !options.customEnd) {
        throw new Error("Custom period requires customStart and customEnd.");
      }
      if (options.customStart > options.customEnd) {
        throw new Error("Custom period start date must not be after its end date.");
      }
      return { key, startDate: options.customStart, endDate: options.customEnd, label: formatLabel(options.customStart, options.customEnd) };
    }
  }
}

// The immediately preceding period of equal length (§15) — e.g. Sep 1-17
// vs Aug 1-17 (17 days each), never a calendar-misaligned comparison.
export function previousEquivalentPeriod(period: ResolvedPeriod): ResolvedPeriod {
  const start = fromDateString(period.startDate);
  const end = fromDateString(period.endDate);
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = addDays(period.startDate, -1);
  const prevStart = addDays(prevEnd, -(lengthDays - 1));
  return { key: "custom", startDate: prevStart, endDate: prevEnd, label: formatLabel(prevStart, prevEnd) };
}
