"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpInputProps = {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
};

// Controlled by the parent (value/onChange) so it can be cleared on resend
// and read back in full to submit — this component only owns focus
// movement and multi-digit distribution, not the digits themselves.
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  error,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusIndex = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  // Shared by paste and by a single change event carrying more than one
  // digit — mobile autofill (SMS/keyboard "one-time-code" suggestions)
  // delivers the whole code as one multi-character value into whichever
  // box has focus, not as a paste event, so both paths need this.
  const distributeDigits = (startIndex: number, digits: string) => {
    const next = [...value];
    for (let i = 0; i < digits.length && startIndex + i < length; i++) {
      next[startIndex + i] = digits[i];
    }
    onChange(next);
    focusIndex(startIndex + digits.length);

    if (next.every((d) => d.length === 1)) {
      onComplete?.(next.join(""));
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");

    if (digits.length > 1) {
      // A full (or partial) code replacing whatever was here before —
      // start from this box, not from wherever it happens to end.
      distributeDigits(index, digits);
      return;
    }

    const next = [...value];
    next[index] = digits;
    onChange(next);

    if (digits && index < length - 1) {
      focusIndex(index + 1);
    }
    if (next.every((d) => d.length === 1)) {
      onComplete?.(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      focusIndex(index - 1);
      const next = [...value];
      next[index - 1] = "";
      onChange(next);
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
      return;
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    e.preventDefault();
    distributeDigits(index, digits);
  };

  return (
    <div role="group" aria-label="Verification code" className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={error}
          className={`h-12 w-10 rounded-none border bg-carbon text-center font-body text-lg text-bone transition-colors duration-150 focus-visible:-outline-offset-2 disabled:opacity-50 sm:h-14 sm:w-12 ${
            error ? "border-smash-text" : "border-carbon"
          }`}
        />
      ))}
    </div>
  );
}
