"use client";

import { useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

const RADIUS = 60;
const MAX_PULL = 6;

type MagneticButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function MagneticButton({
  children,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (prefersReducedMotion()) return;

    const setX = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const setY = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    // The button's own pull offset (applied via setX/setY) shows up in its
    // getBoundingClientRect() too, so it's subtracted back out below to find
    // the button's neutral (unpulled) center on every move.
    let currentX = 0;
    let currentY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      // Measured fresh each move: the entrance timeline (and any ancestor
      // transform) can still be animating the button into place after mount,
      // so a rect cached once at mount/resize goes stale and the magnetic
      // zone drifts away from the button's actual on-screen position.
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2 - currentX;
      const centerY = rect.top + rect.height / 2 - currentY;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > RADIUS) return;

      const pull = (1 - dist / RADIUS) * MAX_PULL;
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;
      currentX = ux * pull;
      currentY = uy * pull;
      setX(currentX);
      setY(currentY);
    };

    const handlePointerLeave = () => {
      currentX = 0;
      currentY = 0;
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    el.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
}
