"use client";

import { useState } from "react";
import FieldShell from "./FieldShell";

type PasswordFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
};

export default function PasswordField({
  label,
  description,
  required,
  error,
  value,
  onChange,
  placeholder,
  autoComplete,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell label={label} description={description} required={required} error={error}>
      {(controlId, describedBy) => (
        <div className="relative">
          <input
            id={controlId}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="w-full rounded-none border border-carbon bg-carbon px-[14px] py-[11px] pr-11 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ash hover:text-bone focus-visible:-outline-offset-2"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      )}
    </FieldShell>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 5.2A11.6 11.6 0 0 1 12 5c7 0 11 7 11 7a13.9 13.9 0 0 1-3.4 4M6.6 6.6A13.7 13.7 0 0 0 1 12s4 7 11 7a10.9 10.9 0 0 0 4.2-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
