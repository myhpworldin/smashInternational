// Same bordered-section pattern already used ad hoc on the admin
// onboarding detail page — pulled out as a shared component here since
// Phase 5 needs it across every portal page, not just one.
export default function ClientSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-carbon pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
