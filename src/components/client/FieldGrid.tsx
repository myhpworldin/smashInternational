// Stage 1 Phase 8 — the label/value grid pattern used by Profile, My
// Onboarding, and the admin onboarding detail page, pulled out once here
// instead of three local copies drifting apart.
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">{children}</div>;
}

export function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="font-body text-xs text-ash">{label}</dt>
      <dd className="font-body text-sm text-bone">{value || "Not provided"}</dd>
    </div>
  );
}
