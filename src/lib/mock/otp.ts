// Mock OTP transport — stands in for two future real endpoints (send +
// verify). Kept behind this exact Promise<Result> shape so swapping the
// body for real `fetch` calls later requires no change to the UI that
// calls it — that's the point, not an accident of how the mock happens
// to be written.
//
// Reachable-without-a-backend test sentinels (documented, not hidden):
//   - email containing "network-error" → sendOtp fails (server/network state)
//   - code "999999" → verifyOtp fails with a network error
//   - code "000000" → verifyOtp fails as an invalid code
// Any other input succeeds.
const NETWORK_FAIL_EMAIL_MARKER = "network-error";
const NETWORK_FAIL_CODE = "999999";
const INVALID_CODE = "000000";

const SEND_DELAY_MS = 900;
const VERIFY_DELAY_MS = 700;

export type SendOtpResult = { ok: true } | { ok: false; reason: "network" };
export type VerifyOtpResult = { ok: true } | { ok: false; reason: "invalid" | "network" };

export function sendOtp(email: string): Promise<SendOtpResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (email.toLowerCase().includes(NETWORK_FAIL_EMAIL_MARKER)) {
        resolve({ ok: false, reason: "network" });
      } else {
        resolve({ ok: true });
      }
    }, SEND_DELAY_MS);
  });
}

export function verifyOtp(code: string): Promise<VerifyOtpResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (code === NETWORK_FAIL_CODE) {
        resolve({ ok: false, reason: "network" });
      } else if (code === INVALID_CODE) {
        resolve({ ok: false, reason: "invalid" });
      } else {
        resolve({ ok: true });
      }
    }, VERIFY_DELAY_MS);
  });
}
