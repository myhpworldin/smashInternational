"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { determineClientDestination } from "@/lib/routing/clientDestination";
import { writeMockClientSession } from "@/lib/mock/clientSession";

type Status = "idle" | "submitting" | "error" | "success";

// Deliberately not dismissible — no close button, no backdrop click, no
// Escape handler. While mustChangePassword is true this is the only
// action available anywhere in the app (Phase 5 spec, §4), so nothing
// here should offer a way out of it. Reused in two places: inline right
// after a successful login (ClientLoginForm, before any navigation has
// happened) and on the standalone /force-password-change page (reached
// by requireRole/blockIfPasswordChangeRequired redirecting there, or by
// someone navigating to it directly). Takes no `role` prop — the
// destination after success is decided from the change-password
// response's role, not from anything the caller passed in.
export default function ChangePasswordModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting" || status === "success") return;

    if (newPassword.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        setStatus("error");
        setError("Your session has expired. Refresh and log in again.");
        return;
      }

      if (!response.ok || !data?.ok) {
        setStatus("error");
        setError(data?.errors?.join(" ") ?? "Couldn't update your password. Try again.");
        return;
      }

      setStatus("success");
      // ProtectedClientRoute (guarding /onboarding and /dashboard) checks
      // this local marker, not the real session cookie — without writing
      // it here, a client landing on either page right after completing
      // a forced password change gets immediately bounced by that guard,
      // same as ClientLoginForm's regular login path already does.
      if (data.role === "client") {
        writeMockClientSession({ role: "client" });
      }
      const destination = data.role === "admin" ? "/admin" : await determineClientDestination();
      router.push(destination);
      router.refresh();
    } catch {
      setStatus("error");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const submitting = status === "submitting" || status === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Update your password"
        className={`flex w-full max-w-md flex-col gap-4 border border-white/15 bg-carbon p-6 transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl text-bone">Update Your Password</h1>
          <p className="font-body text-sm text-ash">
            You signed in with a temporary password. Choose a new password before continuing — this step can&apos;t
            be skipped.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-password" className="font-body text-xs text-ash uppercase">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm-password" className="font-body text-xs text-ash uppercase">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2 disabled:opacity-60"
            />
          </div>

          {error && (
            <p role="alert" className="font-body text-xs text-smash-text">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={status === "submitting"}
            className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {status === "submitting" ? "Updating" : status === "success" ? "Redirecting…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
