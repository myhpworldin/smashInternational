import { site } from "@/shared/config/site";

// Table layout + inline styles throughout — the only markup/CSS approach
// that renders consistently across real email clients (Gmail, Outlook,
// Apple Mail strip or ignore <style> blocks and modern CSS to varying
// degrees). Colors mirror the app's own theme (src/app/globals.css)
// rather than inventing a separate palette for email.
const COLOR = {
  void: "#000000",
  bone: "#edeae6",
  ash: "#8a8a8a",
  carbon: "#131313",
  border: "#2a2a2a",
  smash: "#e50914",
};

const FONT = "Arial, Helvetica, sans-serif";

export type EmailContent = { subject: string; text: string; html: string };

// Shared chrome (wordmark, card, footer) around whatever body markup a
// specific template below passes in. `preheader` is the hidden preview
// text most clients show next to the subject line in the inbox list.
function layout(bodyHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${site.shortName}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLOR.void};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLOR.void};">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.void};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:24px;">
                <span style="font-family:${FONT};font-size:13px;letter-spacing:3px;color:${COLOR.bone};text-transform:uppercase;">
                  ${site.shortName}
                </span>
              </td>
            </tr>
            <tr>
              <td style="background:${COLOR.carbon};border:1px solid ${COLOR.border};padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;">
                <p style="font-family:${FONT};font-size:12px;color:${COLOR.ash};margin:0;line-height:1.6;">
                  ${site.legalName}<br />
                  ${site.address.city}, ${site.address.region}, ${site.address.country}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function otpBody(params: { heading: string; message: string; code: string; expiresMinutes: number }): string {
  return `
    <h1 style="font-family:${FONT};font-size:20px;color:${COLOR.bone};margin:0 0 12px;font-weight:600;">
      ${params.heading}
    </h1>
    <p style="font-family:${FONT};font-size:14px;color:${COLOR.ash};margin:0 0 24px;line-height:1.6;">
      ${params.message}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="background:${COLOR.void};border:1px solid ${COLOR.smash};padding:20px;">
          <span style="font-family:'Courier New',Courier,monospace;font-size:32px;letter-spacing:8px;color:${COLOR.bone};font-weight:700;">
            ${params.code}
          </span>
        </td>
      </tr>
    </table>
    <p style="font-family:${FONT};font-size:12px;color:${COLOR.ash};margin:0;line-height:1.6;">
      This code expires in ${params.expiresMinutes} minutes. If you didn't request this, you can safely ignore
      this email.
    </p>
  `;
}

// Signup's email-verification code and login's passwordless-OTP code are
// the same shape of email (a heading, one line of context, the code) —
// one shared body builder, two callers below with different copy.
function otpEmail(params: {
  subject: string;
  heading: string;
  message: string;
  code: string;
  expiresMinutes: number;
}): EmailContent {
  return {
    subject: params.subject,
    text: `${params.heading}\n\n${params.message}\n\nCode: ${params.code}\n\nThis code expires in ${params.expiresMinutes} minutes. If you didn't request this, you can safely ignore this email.`,
    html: layout(otpBody(params), `Your ${site.shortName} code: ${params.code}`),
  };
}

export function signupVerificationEmail(code: string, expiresMinutes: number): EmailContent {
  return otpEmail({
    subject: `Your ${site.shortName} verification code`,
    heading: "Verify your email",
    message: `Enter this code to verify your email and finish creating your ${site.shortName} account.`,
    code,
    expiresMinutes,
  });
}

export function loginOtpEmail(code: string, expiresMinutes: number): EmailContent {
  return otpEmail({
    subject: `Your ${site.shortName} login code`,
    heading: "Your login code",
    message: `Enter this code to log in to your ${site.shortName} account.`,
    code,
    expiresMinutes,
  });
}

export function duplicateAccountEmail(): EmailContent {
  const heading = "You already have an account";
  const message = "Someone tried to sign up with this email, but an account already exists.";
  const note = "If this was you, log in instead. If it wasn't, you can safely ignore this email.";

  const bodyHtml = `
    <h1 style="font-family:${FONT};font-size:20px;color:${COLOR.bone};margin:0 0 12px;font-weight:600;">
      ${heading}
    </h1>
    <p style="font-family:${FONT};font-size:14px;color:${COLOR.ash};margin:0 0 16px;line-height:1.6;">
      ${message}
    </p>
    <p style="font-family:${FONT};font-size:12px;color:${COLOR.ash};margin:0;line-height:1.6;">
      ${note}
    </p>
  `;

  return {
    subject: `You already have a ${site.shortName} account`,
    text: `${heading}\n\n${message} ${note}`,
    html: layout(bodyHtml, heading),
  };
}
