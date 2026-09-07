"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

export default function Marquee({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const duplicateRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;

      if (prefersReducedMotion()) {
        gsap.set(duplicateRef.current, { display: "none" });
        return;
      }

      const tween = gsap.to(track, {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1,
      });

      const handleEnter = () => tween.pause();
      const handleLeave = () => tween.play();
      const handleVisibility = () => {
        if (document.hidden) tween.pause();
        else tween.play();
      };

      container.addEventListener("pointerenter", handleEnter);
      container.addEventListener("pointerleave", handleLeave);
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        tween.kill();
        container.removeEventListener("pointerenter", handleEnter);
        container.removeEventListener("pointerleave", handleLeave);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="overflow-hidden">
      <div ref={trackRef} className="flex w-max">
        <div className="flex shrink-0">{children}</div>
        <div ref={duplicateRef} className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
