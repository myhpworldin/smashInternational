import FieldShell from "./FieldShell";

type TextFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  type?: "text" | "email" | "url" | "tel" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const INPUT_CLASSNAME =
  "w-full rounded-none border border-carbon bg-carbon px-[14px] py-[11px] font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2";

export default function TextField({
  label,
  description,
  required,
  error,
  type = "text",
  value,
  onChange,
  placeholder,
}: TextFieldProps) {
  return (
    <FieldShell label={label} description={description} required={required} error={error}>
      {(controlId, describedBy) => (
        <input
          id={controlId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={INPUT_CLASSNAME}
        />
      )}
    </FieldShell>
  );
}
