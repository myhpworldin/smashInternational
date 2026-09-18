export type StatusBadgeTone = "neutral" | "positive" | "attention";

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  neutral: "border-white/15 bg-carbon text-bone",
  positive: "border-smash bg-smash-dim text-bone",
  attention: "border-smash-text/60 bg-carbon text-smash-text",
};

// One shared badge for every status label in the portal (service
// engagement status, onboarding status, future report/ticket status) —
// callers supply the label and a tone rather than this component knowing
// about any specific status enum.
export default function ClientStatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusBadgeTone }) {
  return (
    <span className={`border px-2 py-1 font-body text-xs uppercase ${TONE_CLASS[tone]}`}>{label}</span>
  );
}
