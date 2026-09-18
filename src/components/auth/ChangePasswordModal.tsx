"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { determineClientDestination } from "@/lib/routing/clientDestination";

type Status = "idle" | "submitting" | "error" | "success";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.4 20.4 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Toggling visibility never submits the form and never steals focus from
// the input — type="button" plus tabIndex left at default (after the
// input in DOM order) so Tab still goes input → toggle → next field, not
// past it.
function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-ash hover:text-bone focus-visible:-outline-offset-2"
    >
      <EyeIcon open={visible} />
    </button>
  );
}

// Deliberately not dismissible — no close button, no backdrop click, no
// Escape handler, and completing the password change can't be skipped.
// The one intentional way out is signing out entirely (below): without
// it, someone who reached this screen by mistake, or simply wants to walk
// away and come back later as a different account, had no path off this
// page at all — every route bounces back here as long as mustChangePassword
// is true. Reused in two places: inline right after a successful login
// (ClientLoginForm, before any navigation has happened) and on the
// standalone /force-password-change page (reached by
// requireRole/blockIfPasswordChangeRequired redirecting there, or by
// someone navigating to it directly). Takes no `role` prop — the
// destination after success is decided from the change-password
// response's role, not from anything the caller passed in. `email` is
// display-only (whichever identifier the caller has on hand — the real
// account is whatever the session cookie says) — omitted entirely rather
// than guessed when a caller doesn't have one.
export default function ChangePasswordModal({ email }: { email?: string | null } = {}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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
      const destination =
        data.role === "admin" ? "/admin" : data.role === "staff" ? "/staff" : await determineClientDestination();
      router.push(destination);
      router.refresh();
    } catch {
      setStatus("error");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const submitting = status === "submitting" || status === "success";

  const handleSignOut = async () => {
    if (signingOut || submitting) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

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
        <div className="flex items-center justify-between border-b border-white/10 pb-3 font-body text-xs tracking-[0.1em] text-ash">
          <span className="truncate">{email ? `Signed in as ${email}` : "Signed in"}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut || submitting}
            className="shrink-0 text-bone underline decoration-carbon underline-offset-4 transition-colors duration-150 hover:decoration-bone disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

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
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
                className="w-full rounded-none border border-white/15 bg-void px-3 py-2 pr-10 font-body text-sm text-bone focus-visible:-outline-offset-2 disabled:opacity-60"
              />
              <PasswordVisibilityToggle visible={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm-password" className="font-body text-xs text-ash uppercase">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                className="w-full rounded-none border border-white/15 bg-void px-3 py-2 pr-10 font-body text-sm text-bone focus-visible:-outline-offset-2 disabled:opacity-60"
              />
              <PasswordVisibilityToggle
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
              />
            </div>
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
