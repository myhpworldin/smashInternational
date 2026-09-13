"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import TextField from "@/components/form/fields/TextField";
import PasswordField from "@/components/form/fields/PasswordField";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import OtpInput from "@/components/form/fields/OtpInput";
import { useLoginStore } from "@/store/useLoginStore";
import { sendLoginOtp, verifyLoginOtp } from "@/lib/otp/loginTransport";
import { looksLikeEmail, looksLikePhone } from "@/lib/form/identifier";
import { writeMockClientSession } from "@/lib/mock/clientSession";
import { determineClientDestination } from "@/lib/routing/clientDestination";

type Method = "password" | "otp";
type OtpPhase = "idle" | "sending" | "otp_required" | "otp_verification" | "network_error" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

// The documented login concept: one "Email / Mobile" identifier, and a
// choice of Password or OTP as the authentication method — not two
// separate login pages. Both Password and (email) OTP now call real
// backend endpoints (see useLoginStore and src/lib/otp/loginTransport.ts).
// Mobile-number login — either method — is still unsupported: UserDoc has
// no phone field, so there's no backend account to check a password or
// OTP against. Rather than fake it, both paths reject a phone-shaped
// identifier with an explicit "use your email" message.
export default function ClientLoginForm() {
  const router = useRouter();
  const storeStatus = useLoginStore((s) => s.status);
  const storeMessage = useLoginStore((s) => s.message);
  const storeErrorKind = useLoginStore((s) => s.errorKind);
  const submitPassword = useLoginStore((s) => s.submit);

  const [method, setMethod] = useState<Method>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpPhase, setOtpPhase] = useState<OtpPhase>("idle");
  const [otpInvalid, setOtpInvalid] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown === 0) return;
    const interval = setInterval(() => setResendCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const resetForOtherMethod = (next: Method) => {
    setMethod(next);
    setFieldErrors({});
    setOtpPhase("idle");
    setOtpInvalid(false);
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (storeStatus === "submitting") return;

    if (!looksLikeEmail(identifier)) {
      setFieldErrors({
        identifier: "Password login needs an email address right now — use OTP to log in with a mobile number.",
      });
      return;
    }
    setFieldErrors({});

    const role = await submitPassword(identifier, password);
    if (role === "admin") router.push("/admin");
    else if (role === "client") {
      writeMockClientSession({ role: "client" });
      router.push(await determineClientDestination());
    }
  };

  const handleSendOtp = async () => {
    if (otpPhase === "sending") return;

    const trimmed = identifier.trim();
    if (!looksLikeEmail(trimmed)) {
      setFieldErrors({
        identifier: looksLikePhone(trimmed)
          ? "OTP login isn't available for mobile numbers yet — use your email."
          : "Enter a valid email address.",
      });
      return;
    }
    setFieldErrors({});
    setOtpPhase("sending");

    const result = await sendLoginOtp(trimmed);
    if (result.ok) {
      setOtpPhase("otp_required");
      setOtpInvalid(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setOtpPhase("network_error");
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== OTP_LENGTH || otpPhase === "otp_verification") return;

    setOtpPhase("otp_verification");
    setOtpInvalid(false);

    const result = await verifyLoginOtp(identifier.trim(), code);
    if (result.ok) {
      setOtpPhase("success");
      if (result.role === "admin") {
        setTimeout(() => router.push("/admin"), 600);
      } else {
        writeMockClientSession({ role: "client" });
        setTimeout(() => {
          determineClientDestination().then((destination) => router.push(destination));
        }, 600);
      }
    } else if (result.reason === "network") {
      setOtpPhase("network_error");
    } else {
      setOtpPhase("otp_required");
      setOtpInvalid(true);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    void handleSendOtp();
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-5">
      <ChipGroupField
        label="Log in with"
        multiple={false}
        options={[
          { value: "password", label: "Password" },
          { value: "otp", label: "OTP" },
        ]}
        value={[method]}
        onChange={(v) => resetForOtherMethod((v[0] as Method) ?? "password")}
      />

      <TextField
        label="Email or mobile number"
        required
        value={identifier}
        onChange={setIdentifier}
        placeholder="you@example.com or +91 98765 43210"
        error={fieldErrors.identifier}
      />

      {method === "password" ? (
        <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
          <PasswordField
            label="Password"
            required
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={storeStatus === "submitting"}
            aria-busy={storeStatus === "submitting"}
            className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {storeStatus === "submitting" ? "Signing in" : "Sign in"}
          </button>

          {storeStatus === "error" && storeMessage && (
            <p role="alert" className="font-body text-xs text-smash-text">
              {storeErrorKind === "network"
                ? "Couldn't reach the server. Check your connection and try again."
                : storeMessage}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {otpPhase === "idle" && (
            <button
              type="button"
              onClick={handleSendOtp}
              className="rounded-none bg-white px-[18px] py-[14px] font-body text-void focus-visible:-outline-offset-2"
            >
              Send code
            </button>
          )}

          {otpPhase === "sending" && (
            <p className="font-body text-sm text-ash">Sending a code…</p>
          )}

          {otpPhase === "network_error" && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="font-body text-xs text-smash-text">
                Couldn&apos;t reach the server. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={handleSendOtp}
                className="self-start rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-ash focus-visible:-outline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {(otpPhase === "otp_required" || otpPhase === "otp_verification") && (
            <div className="flex flex-col gap-3">
              <p className="font-body text-sm text-ash">Enter the 6-digit code we sent.</p>
              <OtpInput
                value={otpDigits}
                onChange={setOtpDigits}
                onComplete={handleVerifyOtp}
                disabled={otpPhase === "otp_verification"}
                error={otpInvalid}
              />
              {otpInvalid && (
                <p role="alert" className="font-body text-xs text-smash-text">
                  That code isn&apos;t right. Check it and try again.
                </p>
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleVerifyOtp(otpDigits.join(""))}
                  disabled={otpDigits.join("").length !== OTP_LENGTH || otpPhase === "otp_verification"}
                  aria-busy={otpPhase === "otp_verification"}
                  className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
                >
                  {otpPhase === "otp_verification" ? "Verifying" : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="font-body text-xs text-bone underline disabled:text-ash disabled:no-underline focus-visible:-outline-offset-2"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center font-body text-sm text-ash">
        New client?{" "}
        <Link href="/signup" className="text-bone underline hover:text-smash-text focus-visible:-outline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
