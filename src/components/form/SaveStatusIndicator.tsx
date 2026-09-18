import type { SaveStatus } from "@/store/useOnboardingDraftStore";

// A small, persistent confirmation that the draft is being kept — not a
// toast, not a large banner (per the design brief: "do not create a large
// notification every time the form saves"). Error states are already
// surfaced via the existing saveMessage text elsewhere, so this only ever
// renders for "saving" / "saved".
export default function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status !== "saving" && status !== "saved") return null;

  return (
    <p aria-live="polite" className="font-body text-xs text-ash">
      {status === "saving" ? "Saving…" : "Saved"}
    </p>
  );
}
