// Stage 1 Phase 9 §9/§36 — a plain, accessible progress bar reused by
// both projects and campaigns. Never rendered unless the caller actually
// has a real progress number (see ProjectCard/CampaignCard) — this
// component itself doesn't decide whether 0 is "real" or "missing," the
// caller does, by simply not rendering it when the value doesn't exist.
export default function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-body text-xs text-ash">
        <span>{label}</span>
        <span>{clamped}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full bg-carbon"
      >
        <div className="h-full bg-smash" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
