// Stage 1 Phase 5 — every client portal page starts with one of these
// instead of hand-rolling its own <h1>/description block, so heading
// size/spacing/tone stay identical across all ~14 portal pages.
export default function ClientPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">{eyebrow}</p>}
        <h1 className="font-display text-xl text-bone md:text-2xl">{title}</h1>
        {description && <p className="font-body text-sm text-ash">{description}</p>}
      </div>
      {action}
    </div>
  );
}
