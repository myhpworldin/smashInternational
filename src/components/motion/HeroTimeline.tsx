"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

gsap.registerPlugin(useGSAP, SplitText);

export default function HeroTimeline({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const seamPaths = gsap.utils.toArray<SVGPathElement>(
        "#seam-path-desktop, #seam-path-mobile",
        root,
      );
      const letters = gsap.utils.toArray<HTMLElement>("[data-letter]", root);
      const wordmarkEl = root.querySelector<HTMLElement>("h1")!;
      const topRailEl = root.querySelector<HTMLElement>(
        '[data-anim="top-rail"]',
      )!;
      const intlEl = root.querySelector<HTMLElement>('[data-anim="intl"]')!;
      const statementEl = root.querySelector<HTMLElement>(
        '[data-anim="statement"]',
      )!;
      const formEl = root.querySelector<HTMLElement>('[data-anim="form"]')!;
      const serviceStripEl = root.querySelector<HTMLElement>(
        '[data-anim="service-strip"]',
      )!;
      const contactRailEl = root.querySelector<HTMLElement>(
        '[data-anim="contact-rail"]',
      )!;

      const split = new SplitText(statementEl, {
        type: "lines",
        mask: "lines",
      });

      seamPaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });

      if (prefersReducedMotion()) {
        gsap.set(seamPaths, { opacity: 1, strokeDashoffset: 0 });
        gsap.set(letters, { opacity: 1, x: 0, y: 0 });
        gsap.set(wordmarkEl, {
          fontVariationSettings: '"wght" 900, "wdth" 125',
        });
        gsap.set([topRailEl, intlEl], { opacity: 1, y: 0 });
        gsap.set(statementEl, { opacity: 1 });
        gsap.set(split.lines, { y: "0%" });
        gsap.set(formEl, { opacity: 1, y: 0 });
        gsap.set([serviceStripEl, contactRailEl], { opacity: 1 });

        return () => {
          split.revert();
        };
      }

      gsap.set(seamPaths, { opacity: 1 });
      gsap.set(letters, {
        opacity: 0,
        y: 40,
        x: () => gsap.utils.random(-12, 12),
      });
      gsap.set(wordmarkEl, {
        fontVariationSettings: '"wght" 900, "wdth" 62',
      });
      gsap.set([topRailEl, intlEl], { opacity: 0, y: 8 });
      gsap.set(statementEl, { opacity: 1 });
      gsap.set(split.lines, { y: "100%" });
      gsap.set(formEl, { opacity: 0, y: 12 });
      gsap.set([serviceStripEl, contactRailEl], { opacity: 0 });

      const widthProxy = { wdth: 62 };

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to(
        seamPaths,
        { strokeDashoffset: 0, duration: 0.38, ease: "power2.in" },
        0,
      )
        .to(
          letters,
          {
            y: 0,
            x: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power4.out",
            stagger: 0.05,
          },
          0.3,
        )
        .to(
          widthProxy,
          {
            wdth: 125,
            duration: 0.9,
            onUpdate: () => {
              wordmarkEl.style.fontVariationSettings = `"wght" 900, "wdth" ${widthProxy.wdth}`;
            },
          },
          0.3,
        )
        .to(
          root,
          { y: 3, duration: 0.06, ease: "power1.inOut", yoyo: true, repeat: 1 },
          0.42,
        )
        .to(
          [topRailEl, intlEl],
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
          0.9,
        )
        .to(split.lines, { y: "0%", duration: 0.7, stagger: 0.08 }, 1.1)
        .to(formEl, { opacity: 1, y: 0, duration: 0.6 }, 1.4)
        .to(
          [serviceStripEl, contactRailEl],
          { opacity: 1, duration: 0.5, stagger: 0.06 },
          1.55,
        );

      return () => {
        split.revert();
      };
    },
    { scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
