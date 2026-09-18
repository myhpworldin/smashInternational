import ClientPageHeader from "@/components/client/ClientPageHeader";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 5 §16 — controls are visually present and disabled rather
// than omitted, so the layout later phases wire real filtering into
// already exists and doesn't shift.
export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Performance" title="Analytics" />

      <div className="flex flex-wrap gap-2">
        <select disabled className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-ash">
          <option>Date range</option>
        </select>
        <select disabled className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-ash">
          <option>Service</option>
        </select>
        <select disabled className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-ash">
          <option>Campaign</option>
        </select>
      </div>

      <EmptyState message="No analytics data yet." />
    </div>
  );
}
