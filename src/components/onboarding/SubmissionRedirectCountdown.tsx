"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const COUNTDOWN_START_SECONDS = 3;

// Stage 1 Phase 2 — the only place that owns the "just submitted →
// dashboard" timer. A single setInterval, cleared on unmount and the
// instant it reaches zero, so React Strict Mode's mount/unmount/remount
// in dev can never leave two intervals racing each other, and a client
// who navigates away mid-countdown can never trigger a redirect after
// the fact.
export default function SubmissionRedirectCountdown({ destination }: { destination: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_START_SECONDS);
  const navigatedRef = useRef(false);

  const navigate = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.push(destination);
  };

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate();
      return;
    }

    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-body text-sm text-ash" aria-live="polite">
        Redirecting you to your dashboard in {Math.max(secondsLeft, 0)} second
        {secondsLeft === 1 ? "" : "s"}…
      </p>
      <button
        type="button"
        onClick={navigate}
        className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
      >
        Go to Dashboard Now
      </button>
    </div>
  );
}
