"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import TextField from "@/components/form/fields/TextField";
import PasswordField from "@/components/form/fields/PasswordField";
import { signupSchema } from "@/shared/validation/auth";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = signupSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors = issuesToFieldErrors(parsed.error.issues);
      // The password-match refine has no field of its own to attach to —
      // surface it under confirmPassword, where a user expects to see it.
      if (fieldErrors._root) {
        fieldErrors.confirmPassword = fieldErrors._root;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setFormError(data?.errors?.join(" ") ?? data?.message ?? "Couldn't create your account. Try again.");
        setSubmitting(false);
        return;
      }

      // A verification code has already been sent server-side — this
      // navigation never itself triggers a send (see OtpVerificationForm).
      router.push(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        required
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
        error={errors.email}
      />
      <PasswordField
        label="Password"
        required
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password}
      />
      <PasswordField
        label="Confirm password"
        required
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Re-enter your password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="mt-2 rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
      >
        {submitting ? "Creating account" : "Create account"}
      </button>

      {formError && (
        <p role="alert" className="text-center font-body text-xs text-smash-text">
          {formError}
        </p>
      )}

      <p className="text-center font-body text-sm text-ash">
        Already have an account?{" "}
        <Link href="/login" className="text-bone underline hover:text-smash-text focus-visible:-outline-offset-2">
          Log in
        </Link>
      </p>
    </form>
  );
}
