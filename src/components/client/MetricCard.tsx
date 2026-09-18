// Stage 1 Phase 5 §15/§24 — a KPI placeholder, not a live metric: `value`
// is always undefined right now (no performance backend exists yet), so
// this renders "—" rather than inventing a number. Later phases pass a
// real value through the same prop without this component changing.
export default function MetricCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1 border border-carbon p-4">
      <span className="font-body text-xs tracking-[0.14em] text-ash uppercase">{label}</span>
      <span className="font-display text-xl text-bone">{value ?? "—"}</span>
    </div>
  );
}
