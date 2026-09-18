"use client";

import { useEffect, useRef } from "react";
import { useOnboardingDraftStore, type OnboardingDraft } from "@/store/useOnboardingDraftStore";
import { clearSectionCache } from "@/lib/onboarding/draftCache";

const DEBOUNCE_MS = 1500;

// A background durability net for "the user finished this step's fields
// but hasn't clicked Continue yet" — silently persists to the *server*
// draft once the current in-progress value already satisfies that step's
// own validation, using the exact same saveDraft() call Continue itself
// uses. Never sends anything that wouldn't already be accepted by clicking
// Continue right now, so this needs no relaxed/partial validation on the
// server — it's strictly "save a little earlier than the user got around
// to clicking the button", not a new kind of save.
//
// Pass `null` whenever the current value doesn't validate yet — the most
// common case while the user is still mid-typing — a genuinely in-progress
// value is covered by the local draft cache (useDraftCacheSync) instead,
// not by this hook.
export function useOpportunisticAutosave(onboardingId: string, patch: Partial<OnboardingDraft> | null): void {
  const saveDraft = useOnboardingDraftStore((s) => s.saveDraft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentSnapshot = useRef<string | null>(null);
  // The most recent patch that failed to save (a real send failure, not an
  // expired session) — retried once the browser reports connectivity back,
  // so a temporary network drop doesn't just wait out the fixed debounce
  // delay for a save that will only succeed once the connection returns.
  const pendingRetry = useRef<Partial<OnboardingDraft> | null>(null);

  const attemptSave = (toSave: Partial<OnboardingDraft>, snapshot: string) => {
    lastSentSnapshot.current = snapshot;
    void saveDraft(toSave).then((result) => {
      if (result.ok) {
        pendingRetry.current = null;
        for (const section of Object.keys(toSave)) {
          clearSectionCache(onboardingId, section);
        }
      } else if (!result.unauthorized) {
        pendingRetry.current = toSave;
      }
    });
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!patch) return;

    const snapshot = JSON.stringify(patch);
    if (snapshot === lastSentSnapshot.current) return;

    timer.current = setTimeout(() => attemptSave(patch, snapshot), DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingId, patch, saveDraft]);

  useEffect(() => {
    const handleOnline = () => {
      if (pendingRetry.current) {
        attemptSave(pendingRetry.current, JSON.stringify(pendingRetry.current));
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingId]);
}
