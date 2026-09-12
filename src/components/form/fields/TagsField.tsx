import { useState, type KeyboardEvent } from "react";
import FieldShell from "./FieldShell";

type TagsFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
};

// Free-text chip list (e.g. business locations, interests) — press Enter or
// comma to add, backspace on an empty input removes the last tag.
export default function TagsField({
  label,
  description,
  required,
  error,
  value,
  onChange,
  placeholder,
}: TagsFieldProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <FieldShell label={label} description={description} required={required} error={error}>
      {(controlId, describedBy) => (
        <div className="flex flex-wrap items-center gap-2 border border-carbon bg-carbon px-2 py-2">
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="flex items-center gap-1 bg-void px-2 py-1 font-body text-xs text-bone"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${tag}`}
                className="text-ash hover:text-smash-text"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={controlId}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder={value.length === 0 ? placeholder : undefined}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="min-w-[8ch] flex-1 bg-transparent px-1 py-1 font-body text-sm text-bone placeholder-ash focus-visible:outline-none"
          />
        </div>
      )}
    </FieldShell>
  );
}
