"use client";

// Browser-side resilience cache for the onboarding draft — a *secondary*
// layer alongside the server draft (see OnboardingWizard/onboarding.service
// for the authoritative save), covering the gap the server can't: a step's
// in-progress, not-yet-valid field values, which the server-side schema
// won't accept until the section is complete (see saveDraft's validation).
// A refresh/back/tab-close/browser-restart before that point would
// otherwise lose exactly that in-progress typing — this cache is what
// survives it instead.
//
// Namespaced per onboarding record (`onboardingId`, the Mongo _id — never
// the access-token/session credential itself) so one browser's cache can
// never surface as another client's data: a different client always means
// a different onboardingId, and a mismatched id is simply never read.
// Nothing sensitive is ever stored here — only the same draft field values
// (company/objectives/audience/budget/services/brand-profile) already sent
// to the server on every Continue click.

const NAMESPACE = "smash_onboarding_draft";

type CachedSection<T> = { value: T; savedAt: string };

function isStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function sectionKey(onboardingId: string, section: string): string {
  return `${NAMESPACE}:${onboardingId}:section:${section}`;
}

function lastStepKey(onboardingId: string): string {
  return `${NAMESPACE}:${onboardingId}:lastStep`;
}

export function writeSectionCache<T>(onboardingId: string, section: string, value: T): void {
  if (!isStorageAvailable()) return;
  try {
    const entry: CachedSection<T> = { value, savedAt: new Date().toISOString() };
    window.localStorage.setItem(sectionKey(onboardingId, section), JSON.stringify(entry));
  } catch {
    // Storage can be unavailable or full (private browsing, quota) — the
    // cache is a resilience layer, not the source of truth, so degrading
    // to "no local cache" is the safe direction to fail in.
  }
}

// Returns the cached value only if it's actually newer than the server's
// own last-known update — otherwise the server is at least as fresh (e.g.
// another tab/device already saved something, or there's simply nothing
// unsynced), so the stale entry is discarded rather than risking it
// silently overwriting newer server data on the next successful save.
export function readSectionCacheIfNewer<T>(
  onboardingId: string,
  section: string,
  serverUpdatedAt: string,
): T | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(sectionKey(onboardingId, section));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSection<T>;
    if (!parsed || typeof parsed.savedAt !== "string") return null;
    if (parsed.savedAt <= serverUpdatedAt) {
      window.localStorage.removeItem(sectionKey(onboardingId, section));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function clearSectionCache(onboardingId: string, section: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(sectionKey(onboardingId, section));
  } catch {
    // See writeSectionCache.
  }
}

export function writeLastStep(onboardingId: string, stepId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(lastStepKey(onboardingId), stepId);
  } catch {
    // See writeSectionCache.
  }
}

export function readLastStep(onboardingId: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(lastStepKey(onboardingId));
  } catch {
    return null;
  }
}

// All section keys the onboarding draft can ever cache under — kept in one
// place so "clear everything for this draft" (on successful submission)
// can't drift out of sync with the individual section keys steps write to.
export const DRAFT_SECTIONS = [
  "selectedServiceIds",
  "serviceResponses",
  "brandProfile",
  "company",
  "objectives",
  "targetAudience",
  "budget",
] as const;

export function clearAllDraftCache(onboardingId: string): void {
  if (!isStorageAvailable()) return;
  try {
    for (const section of DRAFT_SECTIONS) {
      window.localStorage.removeItem(sectionKey(onboardingId, section));
    }
    window.localStorage.removeItem(lastStepKey(onboardingId));
  } catch {
    // See writeSectionCache.
  }
}
