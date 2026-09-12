import { useId, type ReactNode } from "react";

type FieldShellProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: (controlId: string, describedBy: string | undefined) => ReactNode;
};

// Shared chrome (label/description/required marker/error) around any input
// control — every field in the onboarding form is built on this rather than
// repeating the label/error markup per field.
export default function FieldShell({
  label,
  description,
  required,
  error,
  children,
}: FieldShellProps) {
  const controlId = useId();
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="font-body text-sm text-bone">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-smash-text">
            *
          </span>
        )}
      </label>
      {description && (
        <p id={descriptionId} className="font-body text-xs text-ash">
          {description}
        </p>
      )}
      {children(controlId, describedBy)}
      {error && (
        <p id={errorId} role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
    </div>
  );
}
