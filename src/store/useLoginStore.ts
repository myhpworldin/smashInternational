import { create } from "zustand";
import { loginSchema } from "@/shared/validation/auth";

type Status = "idle" | "submitting" | "error";

type LoginState = {
  status: Status;
  message: string | null;
  submit: (email: string, password: string) => Promise<string | null>;
};

const INVALID_MESSAGE = "Enter a valid email and password.";

export const useLoginStore = create<LoginState>((set, get) => ({
  status: "idle",
  message: null,

  submit: async (email: string, password: string) => {
    if (get().status === "submitting") return null;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      set({ status: "error", message: INVALID_MESSAGE });
      return null;
    }

    set({ status: "submitting", message: null });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        set({ status: "error", message: data?.message ?? INVALID_MESSAGE });
        return null;
      }

      set({ status: "idle", message: null });
      return data.role as string;
    } catch {
      set({
        status: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
      return null;
    }
  },
}));
