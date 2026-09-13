"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import OtpInput from "@/components/form/fields/OtpInput";
import StepTransition from "@/components/onboarding/StepTransition";
import StatusIcon from "@/components/onboarding/StatusIcon";
import { resendSignupOtp, verifySignupOtp } from "@/lib/otp/signupTransport";
import { maskEmail } from "@/lib/format/maskEmail";
import { writeMockClientSession } from "@/lib/mock/clientSession";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_VALIDITY_SECONDS = 5 * 60;
const VERIFIED_PAUSE_MS = 900;

// One state machine, one transport call per transition — swapping
// sendOtp/verifyOtp (src/lib/mock/otp.ts) for real fetch calls later
// changes none of the states or UI below them.
type VerificationState =
  | "sending"
  | "awaiting_input"
  | "verifying"
  | "verified"
  | "invalid"
  | "expired"
  | "network_error";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // Starts at "awaiting_input", not "sending": the first code was already
  // dispatched as a side effect of the signup call that brought the user
  // here (see /api/auth/signup) — sending another on arrival would mean
  // two emails for one signup. "sending" is now only ever entered from an
  // explicit resend or retry.
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [state, setState] = useState<VerificationState>("awaiting_input");
  const [failedAction, setFailedAction] = useState<"send" | "verify" | null>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [expiresIn, setExpiresIn] = useState(OTP_VALIDITY_SECONDS);
  const [justResent, setJustResent] = useState(false);

  // Only ever fires the request and reacts to its result — never calls
  // setState synchronously itself, so it's safe to invoke directly from
  // an event handler without a stray re-render in between.
  const attemptSend = () => {
    resendSignupOtp(email).then((result) => {
      if (result.ok) {
        setState("awaiting_input");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setExpiresIn(OTP_VALIDITY_SECONDS);
      } else {
        setState("network_error");
        setFailedAction("send");
      }
    });
  };

  // The resend cooldown and the code's own validity window are two
  // independent timers — a code can still be valid well after resend
  // becomes available again, and vice versa near expiry.
  useEffect(() => {
    if (state !== "awaiting_input" && state !== "invalid") return;

    const interval = setInterval(() => {
      setResendCooldown((s) => Math.max(s - 1, 0));
      setExpiresIn((s) => {
        if (s <= 1) {
          setState("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  const verify = (code: string) => {
    if (state === "expired" || state === "verifying" || state === "sending") return;
    if (code.length !== OTP_LENGTH) return;

    setState("verifying");
    setFailedAction(null);

    verifySignupOtp(email, code).then((result) => {
      if (result.ok) {
        setState("verified");
        // Verifying signup's email OTP is this mock's "you're a client
        // now" moment — see lib/mock/clientSession.ts for what this is
        // and isn't.
        writeMockClientSession({ role: "client" });
        setTimeout(() => router.push("/onboarding"), VERIFIED_PAUSE_MS);
      } else if (result.reason === "network") {
        setState("network_error");
        setFailedAction("verify");
      } else {
        setState("invalid");
      }
    });
  };

  const handleResend = () => {
    if (resendCooldown > 0 || state === "sending") return;
    setDigits(Array(OTP_LENGTH).fill(""));
    setState("sending");
    setFailedAction(null);
    attemptSend();
    setJustResent(true);
    setTimeout(() => setJustResent(false), 4000);
  };

  const handleRetry = () => {
    if (failedAction === "verify") {
      verify(digits.join(""));
      return;
    }
    setState("sending");
    setFailedAction(null);
    attemptSend();
  };

  const code = digits.join("");
  const inputDisabled = state === "expired" || state === "verifying" || state === "sending" || state === "verified";

  return (
    <StepTransition>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-display text-2xl text-bone">Verify your email</h1>
          <p className="font-body text-sm text-ash">
            {state === "sending" && !justResent
              ? "Sending a code to your email…"
              : email
                ? <>We sent a 6-digit code to <span className="text-bone">{maskEmail(email)}</span>.</>
                : "We sent a 6-digit code to your email."}
          </p>
        </div>

        {state === "network_error" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p role="alert" className="font-body text-sm text-smash-text">
              {failedAction === "send"
                ? "Couldn't send the code. Check your connection and try again."
                : "Couldn't verify the code. Check your connection and try again."}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-ash focus-visible:-outline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : state === "verified" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <StatusIcon />
            <p className="font-body text-sm text-bone">Verified</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <OtpInput
                value={digits}
                onChange={setDigits}
                onComplete={verify}
                disabled={inputDisabled}
                error={state === "invalid"}
              />

              {state === "invalid" && (
                <p role="alert" className="font-body text-xs text-smash-text">
                  That code isn&apos;t right. Check it and try again.
                </p>
              )}
              {state === "expired" && (
                <p role="alert" className="font-body text-xs text-smash-text">
                  This code has expired. Request a new one below.
                </p>
              )}
              {state === "awaiting_input" && (
                <p className="font-body text-xs text-ash">Code expires in {formatCountdown(expiresIn)}</p>
              )}
              {justResent && state !== "sending" && (
                <p className="font-body text-xs text-bone">A new code has been sent.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => verify(code)}
              disabled={code.length !== OTP_LENGTH || inputDisabled}
              aria-busy={state === "verifying"}
              className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
            >
              {state === "verifying" ? "Verifying" : "Verify"}
            </button>
          </>
        )}

        {state !== "verified" && (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || state === "sending"}
              aria-busy={state === "sending" && justResent}
              className="font-body text-sm text-bone underline disabled:text-ash disabled:no-underline focus-visible:-outline-offset-2"
            >
              {state === "sending" && justResent
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
            </button>
            <Link href="/signup" className="font-body text-xs text-ash underline hover:text-bone">
              Entered the wrong email?
            </Link>
          </div>
        )}
      </div>
    </StepTransition>
  );
}
