"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

gsap.registerPlugin(useGSAP);

export type ValidationSummaryItem = { key: string; label: string };

type ValidationSummaryProps = {
  items: ValidationSummaryItem[];
  onSelect: (key: string) => void;
  title?: string;
};

// Compact summary rendered right above a step's Continue/Submit button.
// Inline per-field errors (FieldShell) stay the source of truth — this only
// restates *which* of them are still unresolved, since a field's own error
// text can end up scrolled out of view once the form grows past one screen.
// Give it a changing `key` prop (e.g. a per-attempt counter) to replay the
// entrance animation on each new failed attempt, the same way StepTransition
// re-animates via `key={step}`.
export default function ValidationSummary({ items, onSelect, title }: ValidationSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    },
    { scope: ref },
  );

  if (items.length === 0) return null;

  const count = items.length;

  return (
    <div ref={ref} role="alert" aria-live="assertive" className="flex flex-col gap-2 border border-smash-dim p-4">
      <p className="font-body text-xs tracking-[0.14em] text-smash-text uppercase">
        {count === 1 ? "1 item needs your attention" : `${count} items need your attention`}
      </p>
      <p className="font-body text-sm text-ash">
        {title ?? "Please complete the highlighted fields before continuing."}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className="font-body text-sm text-bone underline decoration-ash underline-offset-2 hover:text-white focus-visible:-outline-offset-2"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
