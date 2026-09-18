"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/client-actions/messages";

// Stage 1 Phase 15 §18 — no optimistic message insertion: since there's
// no backend to actually store a sent message yet, faking one appearing
// in the thread would be indistinguishable from a real send and violate
// the same "never claim persisted" rule as every other client-action
// abstraction this session. The composer honestly reports the send
// failed rather than pretending it worked.
export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (text.trim().length === 0) {
      setError("Enter a message before sending.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await sendMessage(conversationId, text.trim());
    setSubmitting(false);

    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-carbon pt-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <label htmlFor="message-composer" className="sr-only">
        Message
      </label>
      <div className="flex gap-2">
        <textarea
          id="message-composer"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="self-end rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Sending" : "Send"}
        </button>
      </div>
    </form>
  );
}
