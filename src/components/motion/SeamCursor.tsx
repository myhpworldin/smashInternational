"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

const MAX_OFFSET = 18;

type Point = { x: number; y: number };

function parsePoints(d: string): Point[] {
  const matches = d.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  const nums = matches.map(Number);
  const points: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  return points;
}

function buildPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

export default function SeamCursor() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (prefersReducedMotion()) return;

    const paths = Array.from(
      document.querySelectorAll<SVGPathElement>(
        "#seam-path-desktop, #seam-path-mobile",
      ),
    );
    if (paths.length === 0) return;

    const basePoints = paths.map((path) =>
      parsePoints(path.getAttribute("d") || ""),
    );
    const midIndexes = basePoints.map((pts) => Math.floor(pts.length / 2));

    const offset = { x: 0, y: 0 };

    const render = () => {
      paths.forEach((path, i) => {
        const pts = basePoints[i].map((p) => ({ ...p }));
        const mid = midIndexes[i];
        pts[mid] = { x: pts[mid].x + offset.x, y: pts[mid].y + offset.y };
        path.setAttribute("d", buildPath(pts));
      });
    };

    const setX = gsap.quickTo(offset, "x", {
      duration: 0.5,
      ease: "power3.out",
      onUpdate: render,
    });
    const setY = gsap.quickTo(offset, "y", {
      duration: 0.5,
      ease: "power3.out",
      onUpdate: render,
    });

    let latest: Point | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      latest = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      if (!latest) return;
      const svg = paths[0].ownerSVGElement;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const point = svg.createSVGPoint();
      point.x = latest.x;
      point.y = latest.y;
      const local = point.matrixTransform(ctm.inverse());

      const base = basePoints[0][midIndexes[0]];
      const dx = local.x - base.x;
      const dy = local.y - base.y;
      const dist = Math.hypot(dx, dy);
      const mag = Math.min(dist, MAX_OFFSET);
      const ux = dist ? dx / dist : 0;
      const uy = dist ? dy / dist : 0;

      setX(ux * mag);
      setY(uy * mag);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      gsap.ticker.remove(tick);
      paths.forEach((path, i) => {
        path.setAttribute("d", buildPath(basePoints[i]));
      });
    };
  }, []);

  return null;
}
