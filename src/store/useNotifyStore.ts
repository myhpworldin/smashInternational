import { create } from "zustand";
import { notifySchema } from "@/shared/validation/notify";

type Status = "idle" | "submitting" | "success" | "error";

type NotifyState = {
  status: Status;
  message: string | null;
  submit: (email: string) => Promise<void>;
  reset: () => void;
};

const INVALID_EMAIL_MESSAGE =
  "That email doesn't look right. Check it and try again.";

export const useNotifyStore = create<NotifyState>((set, get) => ({
  status: "idle",
  message: null,

  submit: async (email: string) => {
    if (get().status === "submitting") return;

    const parsed = notifySchema.safeParse({ email });
    if (!parsed.success) {
      set({ status: "error", message: INVALID_EMAIL_MESSAGE });
      return;
    }

    set({ status: "submitting", message: null });

    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        set({
          status: "error",
          message: data?.message ?? INVALID_EMAIL_MESSAGE,
        });
        return;
      }

      set({ status: "success", message: null });
    } catch {
      set({
        status: "error",
        message:
          "Couldn't reach the server. Check your connection and try again.",
      });
    }
  },

  reset: () => set({ status: "idle", message: null }),
}));
