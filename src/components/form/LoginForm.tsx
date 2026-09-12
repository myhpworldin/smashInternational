"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLoginStore } from "@/store/useLoginStore";

// Admin is the only login role left — client onboarding is the public,
// cookie-based /onboarding flow now, no account.
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const status = useLoginStore((s) => s.status);
  const message = useLoginStore((s) => s.message);
  const submit = useLoginStore((s) => s.submit);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    const role = await submit(email, password);
    if (role === "admin") {
      router.push("/admin");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="login-email" className="sr-only">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === "submitting"}
          className="rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="sr-only">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={status === "submitting"}
          className="rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        aria-busy={status === "submitting"}
        className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
      >
        {status === "submitting" ? "Signing in" : "Sign in"}
      </button>
      {status === "error" && message && (
        <p role="alert" className="text-[14px] text-smash-text">
          {message}
        </p>
      )}
    </form>
  );
}
