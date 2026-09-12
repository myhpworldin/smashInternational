import { create } from "zustand";

export type ServiceResponseEntry = { serviceId: string; responses: Record<string, unknown> };

export type OnboardingDraft = {
  selectedServiceIds: string[];
  serviceResponses: ServiceResponseEntry[];
  brandProfile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  objectives: Record<string, unknown> | null;
  targetAudience: Record<string, unknown> | null;
  budget: Record<string, unknown> | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveResult = { ok: true } | { ok: false; unauthorized: boolean; message: string };

type OnboardingDraftState = {
  saveStatus: SaveStatus;
  saveMessage: string | null;
  saveDraft: (patch: Partial<OnboardingDraft>) => Promise<SaveResult>;
};

// Deliberately holds no draft data itself — a module-level store can't be
// seeded with the server-rendered draft before its first paint (hydrate()
// only ever ran in a useEffect, which never runs during SSR), so an early
// build of this had the progress bar reading a still-empty default draft on
// first render even though the server had already sent complete data. The
// draft itself now lives in OnboardingWizard's own state, initialized
// directly from the page's server-fetched prop; this store only makes the
// save request and reports its status.
export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  saveStatus: "idle",
  saveMessage: null,

  saveDraft: async (patch) => {
    set({ saveStatus: "saving", saveMessage: null });

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (response.status === 401) {
        set({ saveStatus: "error", saveMessage: "Your session has expired. Please sign in again." });
        return { ok: false, unauthorized: true, message: "Session expired." };
      }

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const message =
          data?.errors?.join(" ") ?? data?.message ?? "Couldn't save your changes. Try again.";
        set({ saveStatus: "error", saveMessage: message });
        return { ok: false, unauthorized: false, message };
      }

      set({ saveStatus: "saved", saveMessage: null });
      return { ok: true };
    } catch {
      const message = "Couldn't reach the server. Check your connection and try again.";
      set({ saveStatus: "error", saveMessage: message });
      return { ok: false, unauthorized: false, message };
    }
  },
}));
