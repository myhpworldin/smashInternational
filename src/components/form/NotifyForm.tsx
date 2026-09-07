"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { gsap } from "gsap";
import { useNotifyStore } from "@/store/useNotifyStore";

function subscribePointerFine(callback: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getPointerFineSnapshot() {
  return window.matchMedia("(pointer: fine)").matches;
}

function getPointerFineServerSnapshot() {
  return false;
}

const SeamCursor = dynamic(() => import("@/components/motion/SeamCursor"), {
  ssr: false,
});
const MagneticButton = dynamic(
  () => import("@/components/ui/MagneticButton"),
  { ssr: false },
);

// The email input and this button sit flush against each other with no gap
// or radius, so the global 2px outline-offset would bleed a focus ring onto
// the neighbor. Pulling the ring inward keeps it contained to each control.
const buttonClassName =
  "rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2";

export default function NotifyForm() {
  const pointerFine = useSyncExternalStore(
    subscribePointerFine,
    getPointerFineSnapshot,
    getPointerFineServerSnapshot,
  );
  const [email, setEmail] = useState("");
  const status = useNotifyStore((s) => s.status);
  const message = useNotifyStore((s) => s.message);
  const submit = useNotifyStore((s) => s.submit);

  useEffect(() => {
    if (status !== "success") return;

    const seamPaths = document.querySelectorAll<SVGPathElement>(
      "#seam-path-desktop, #seam-path-mobile",
    );
    if (seamPaths.length > 0) {
      gsap.set(seamPaths, { transformOrigin: "50% 50%" });
      gsap.to(seamPaths, {
        scale: 1.08,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      });
    }

    const successEl = document.querySelector<HTMLElement>(
      '[data-anim="notify-success"]',
    );
    if (successEl) {
      gsap.fromTo(
        successEl,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
      );
    }
  }, [status]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    void submit(email);
  };

  if (status === "success") {
    return (
      <div
        data-anim="notify-success"
        className="mt-6 font-body text-xl text-bone md:mt-10"
      >
        You&apos;re on the list.
      </div>
    );
  }

  return (
    <>
      {pointerFine && <SeamCursor />}
      <form
        data-anim="form"
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex w-full translate-y-3 flex-col gap-2 opacity-0 md:mt-10 md:w-auto"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <label htmlFor="notify-email" className="sr-only">
            Email address
          </label>
          <input
            id="notify-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={status === "submitting"}
            className="min-w-0 flex-1 rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-bone placeholder-ash focus-visible:-outline-offset-2 md:flex-none md:w-72"
          />
          {pointerFine ? (
            <MagneticButton
              type="submit"
              disabled={status === "submitting"}
              aria-busy={status === "submitting"}
              className={buttonClassName}
            >
              {status === "submitting" ? "Sending" : "Notify me"}
            </MagneticButton>
          ) : (
            <button
              type="submit"
              disabled={status === "submitting"}
              aria-busy={status === "submitting"}
              className={buttonClassName}
            >
              {status === "submitting" ? "Sending" : "Notify me"}
            </button>
          )}
        </div>
        {status === "error" && message && (
          <p role="alert" className="text-[14px] text-smash-text">
            {message}
          </p>
        )}
      </form>
    </>
  );
}
