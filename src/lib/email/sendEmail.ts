import "server-only";

// No email provider has been chosen for this project yet (flagged in the
// Stage 2 Phase 1 audit, same as the file-storage decision was flagged in
// Stage 0 Phase 1 before GridFS was picked). Rather than silently install
// an SDK and commit to a vendor, this is a single, small, swappable
// function: Resend's plain HTTP API via fetch (no dependency) when
// RESEND_API_KEY is set, otherwise the email is logged to the server
// console instead of sent — safe for local development, and honest about
// not actually delivering anything until a real key is configured.
// Credentials only ever come from environment variables, never from code.
export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  // Optional structured/styled body (see src/lib/email/templates.ts) —
  // `text` stays required regardless, both because Resend/most clients
  // want a plain-text alternative for deliverability, and because it's
  // what the unconfigured-provider console fallback below prints.
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[email:unconfigured] to=${input.to} subject="${input.subject}"\n${input.text}`);
    return { ok: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });

    if (!response.ok) {
      console.error("[email] send failed:", response.status, await response.text().catch(() => ""));
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] send failed:", error);
    return { ok: false };
  }
}
