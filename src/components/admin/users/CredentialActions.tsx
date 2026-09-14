"use client";

import { useState } from "react";

type FeedbackKind = "details" | "credentials" | null;

// The button row shared by CreationResultDialog and PasswordResetResultDialog
// — both are one-time reveals of a freshly generated temporary password
// (Phase 6 spec). `detailsText` never contains a password; `credentialsText`
// is the only thing that does, and it's passed in from the caller's
// in-memory creation/reset response, never fetched from anywhere.
export default function CredentialActions({
  detailsText,
  credentialsText,
  shareTitle,
}: {
  detailsText?: string;
  credentialsText: string;
  shareTitle: string;
}) {
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = async (text: string, kind: Exclude<FeedbackKind, null>) => {
    try {
      await navigator.clipboard.writeText(text);
      setError(null);
      setFeedback(kind);
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setError("Couldn't copy — check clipboard permissions.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: credentialsText });
      } catch {
        /* user cancelled the share sheet — no error to surface */
      }
      return;
    }
    // No native share on this browser/device — fall back to a copy of the
    // exact same credentials text (Phase 6 spec §3).
    await copy(credentialsText, "credentials");
  };

  return (
    <div className="flex flex-col gap-2">
      {detailsText && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => copy(detailsText, "details")}
            className="flex-1 rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
          >
            {feedback === "details" ? "Copied" : "Copy Details"}
          </button>
          <button
            type="button"
            onClick={() => copy(credentialsText, "credentials")}
            className="flex-1 rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
          >
            {feedback === "credentials" ? "Credentials copied" : "Copy Credentials"}
          </button>
        </div>
      )}

      {!detailsText && (
        <button
          type="button"
          onClick={() => copy(credentialsText, "credentials")}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
        >
          {feedback === "credentials" ? "Credentials copied" : "Copy Credentials"}
        </button>
      )}

      <button
        type="button"
        onClick={handleShare}
        className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
      >
        Share Credentials
      </button>

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
    </div>
  );
}
