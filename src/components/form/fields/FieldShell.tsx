import { useId, type ReactNode } from "react";

type FieldShellProps = {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  // Registers this field's outer container against a step's field registry
  // (see useFieldRegistry) so a failed Continue/Submit can scroll/focus it.
  fieldRef?: (el: HTMLDivElement | null) => void;
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
  fieldRef,
  children,
}: FieldShellProps) {
  const controlId = useId();
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div ref={fieldRef} className="flex flex-col gap-1.5">
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
