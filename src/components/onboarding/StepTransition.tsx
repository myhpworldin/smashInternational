"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

gsap.registerPlugin(useGSAP);

// A short fade + rise on mount — deliberately the only step-transition
// animation, so switching steps reads as a single clear beat rather than a
// choreographed sequence (that's the hero page's job, not this form's).
export default function StepTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
