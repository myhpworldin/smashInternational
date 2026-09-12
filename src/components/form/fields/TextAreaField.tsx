import FieldShell from "./FieldShell";

type TextAreaFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export default function TextAreaField({
  label,
  description,
  required,
  error,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} description={description} required={required} error={error}>
      {(controlId, describedBy) => (
        <textarea
          id={controlId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="w-full resize-y rounded-none border border-carbon bg-carbon px-[14px] py-[11px] font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      )}
    </FieldShell>
  );
}
