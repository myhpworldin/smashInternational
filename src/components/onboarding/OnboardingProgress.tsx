export type ProgressStep = { id: string; label: string; complete: boolean };

type OnboardingProgressProps = {
  steps: ProgressStep[];
  currentStepId: string;
};

// Percentage is derived from how many steps actually pass their own
// completeness check (see completeness.ts) — never a fixed/staged number.
export default function OnboardingProgress({ steps, currentStepId }: OnboardingProgressProps) {
  const completedCount = steps.filter((s) => s.complete).length;
  const percent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-body text-xs text-ash">
        <span>
          Step {steps.findIndex((s) => s.id === currentStepId) + 1} of {steps.length}
        </span>
        <span>{percent}% complete</span>
      </div>
      <div className="h-[3px] w-full bg-carbon">
        <div
          className="h-full bg-smash transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-1 font-body text-xs">
        {steps.map((step) => {
          const isCurrent = step.id === currentStepId;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={
                isCurrent
                  ? "text-bone"
                  : step.complete
                    ? "text-ash"
                    : "text-ash/60"
              }
            >
              {step.complete && !isCurrent ? "✓ " : ""}
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
