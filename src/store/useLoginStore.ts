import { create } from "zustand";
import { loginSchema } from "@/shared/validation/auth";

type Status = "idle" | "submitting" | "error";
// Additive only — existing consumers (admin's LoginForm) read just
// status/message and are unaffected by this new field. "unverified" is
// only ever set when the submitted password was already correct (see
// the route's comment) — it's not a new way to probe account existence.
type ErrorKind = "validation" | "credentials" | "network" | "unverified" | null;

export type LoginSubmitResult = { role: string; mustChangePassword: boolean };

type LoginState = {
  status: Status;
  message: string | null;
  errorKind: ErrorKind;
  // Set alongside an "unverified" error so the form can offer a direct
  // "resend verification email" action without the user retyping it.
  unverifiedEmail: string | null;
  submit: (email: string, password: string) => Promise<LoginSubmitResult | null>;
};

const INVALID_MESSAGE = "Enter a valid email and password.";

export const useLoginStore = create<LoginState>((set, get) => ({
  status: "idle",
  message: null,
  errorKind: null,
  unverifiedEmail: null,

  submit: async (email: string, password: string) => {
    if (get().status === "submitting") return null;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      set({ status: "error", message: INVALID_MESSAGE, errorKind: "validation", unverifiedEmail: null });
      return null;
    }

    set({ status: "submitting", message: null, errorKind: null, unverifiedEmail: null });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const unverified = data?.reason === "unverified";
        set({
          status: "error",
          message: data?.message ?? INVALID_MESSAGE,
          errorKind: unverified ? "unverified" : "credentials",
          unverifiedEmail: unverified ? parsed.data.email : null,
        });
        return null;
      }

      set({ status: "idle", message: null, errorKind: null, unverifiedEmail: null });
      return { role: data.role as string, mustChangePassword: Boolean(data.mustChangePassword) };
    } catch {
      set({
        status: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
        errorKind: "network",
        unverifiedEmail: null,
      });
      return null;
    }
  },
}));
