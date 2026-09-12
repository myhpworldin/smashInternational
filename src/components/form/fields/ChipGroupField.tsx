import FieldShell from "./FieldShell";

export type ChipOption = { value: string; label: string };

type ChipGroupFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
};

// Toggleable chip group — used for anything that's really a fixed set of
// single- or multi-select values (objectives, age groups, gender, customer
// type) so those fields share one visual language instead of native
// selects/radios each looking different.
export default function ChipGroupField({
  label,
  description,
  required,
  error,
  options,
  value,
  onChange,
  multiple = true,
}: ChipGroupFieldProps) {
  const toggle = (optionValue: string) => {
    if (multiple) {
      onChange(
        value.includes(optionValue)
          ? value.filter((v) => v !== optionValue)
          : [...value, optionValue],
      );
      return;
    }
    onChange(value.includes(optionValue) ? [] : [optionValue]);
  };

  return (
    <FieldShell label={label} description={description} required={required} error={error}>
      {(controlId, describedBy) => (
        <div id={controlId} aria-describedby={describedBy} className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(option.value)}
                className={`rounded-none border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
                  selected
                    ? "border-smash bg-smash-dim text-bone"
                    : "border-carbon bg-carbon text-ash hover:text-bone"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </FieldShell>
  );
}
