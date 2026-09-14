import { create } from "zustand";
import { loginSchema } from "@/shared/validation/auth";

type Status = "idle" | "submitting" | "error";
// Additive only — existing consumers (admin's LoginForm) read just
// status/message and are unaffected by this new field.
type ErrorKind = "validation" | "credentials" | "network" | null;

export type LoginSubmitResult = { role: string; mustChangePassword: boolean };

type LoginState = {
  status: Status;
  message: string | null;
  errorKind: ErrorKind;
  submit: (email: string, password: string) => Promise<LoginSubmitResult | null>;
};

const INVALID_MESSAGE = "Enter a valid email and password.";

export const useLoginStore = create<LoginState>((set, get) => ({
  status: "idle",
  message: null,
  errorKind: null,

  submit: async (email: string, password: string) => {
    if (get().status === "submitting") return null;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      set({ status: "error", message: INVALID_MESSAGE, errorKind: "validation" });
      return null;
    }

    set({ status: "submitting", message: null, errorKind: null });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        set({ status: "error", message: data?.message ?? INVALID_MESSAGE, errorKind: "credentials" });
        return null;
      }

      set({ status: "idle", message: null, errorKind: null });
      return { role: data.role as string, mustChangePassword: Boolean(data.mustChangePassword) };
    } catch {
      set({
        status: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
        errorKind: "network",
      });
      return null;
    }
  },
}));
