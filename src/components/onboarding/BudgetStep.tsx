"use client";

import { useState } from "react";
import TextField from "@/components/form/fields/TextField";
import { getApplicableBudgetChannels } from "@/shared/config/services";
import { budgetAllocationSchema, budgetSchema, type BudgetInput } from "@/shared/validation/onboarding";
import { formatINR } from "@/lib/format/currency";
import { useFieldRegistry } from "@/lib/form/useFieldRegistry";
import ValidationSummary from "@/components/form/ValidationSummary";

type BudgetStepProps = {
  selectedServiceIds: string[];
  initialValue: Partial<BudgetInput> | null;
  onNext: (value: BudgetInput) => Promise<void>;
  onBack: () => void;
  saving: boolean;
  saveMessage: string | null;
};

export default function BudgetStep({
  selectedServiceIds,
  initialValue,
  onNext,
  onBack,
  saving,
  saveMessage,
}: BudgetStepProps) {
  const channels = getApplicableBudgetChannels(selectedServiceIds);

  const [monthlyTotal, setMonthlyTotal] = useState(
    initialValue?.monthlyTotal !== undefined ? String(initialValue.monthlyTotal) : "",
  );
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const existing = new Map((initialValue?.allocations ?? []).map((a) => [a.channel, a.amount]));
    const result: Record<string, string> = {};
    for (const channel of channels) {
      const value = existing.get(channel.value);
      result[channel.value] = value !== undefined ? String(value) : "";
    }
    return result;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  const totalNum = Number(monthlyTotal) || 0;
  const allocatedNum = channels.reduce((sum, c) => sum + (Number(amounts[c.value]) || 0), 0);
  const remainingNum = totalNum - allocatedNum;

  const FIELD_ORDER = ["monthlyTotal", ...channels.map((c) => `allocation.${c.value}`)];
  const FIELD_LABELS: Record<string, string> = {
    monthlyTotal: "Monthly marketing budget",
    ...Object.fromEntries(channels.map((c) => [`allocation.${c.value}`, c.label])),
  };

  // Validates the whole budget (bounds + the allocated-vs-total refine) and
  // also checks each channel's amount individually against the same
  // per-allocation schema, since budgetSchema's `allocations` array only
  // includes channels with a non-zero amount — an out-of-range value in a
  // channel the user hasn't typed into yet should never block them.
  const validateAll = () => {
    const allocations = channels
      .map((c) => ({ channel: c.value, amount: Number(amounts[c.value]) || 0 }))
      .filter((a) => a.amount > 0);

    const parsed = budgetSchema.safeParse({ monthlyTotal: totalNum, allocations });

    const nextFieldErrors: Record<string, string> = {};
    let nextRootError: string | null = null;

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path.length === 0) {
          nextRootError = issue.message;
        } else if (issue.path[0] === "monthlyTotal") {
          nextFieldErrors.monthlyTotal = issue.message;
        }
      }
    }

    for (const channel of channels) {
      const amount = Number(amounts[channel.value]) || 0;
      if (amount <= 0) continue;
      const result = budgetAllocationSchema.safeParse({ channel: channel.value, amount });
      if (!result.success) {
        const amountIssue = result.error.issues.find((i) => i.path[0] === "amount");
        if (amountIssue) nextFieldErrors[`allocation.${channel.value}`] = amountIssue.message;
      }
    }

    return {
      ok: parsed.success && Object.keys(nextFieldErrors).length === 0,
      data: parsed.success ? parsed.data : null,
      fieldErrors: nextFieldErrors,
      rootError: nextRootError,
    };
  };

  const validateField = (key: string) => {
    const result = validateAll();
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (result.fieldErrors[key]) next[key] = result.fieldErrors[key];
      else delete next[key];
      return next;
    });
  };

  const handleContinue = () => {
    const result = validateAll();
    setFieldErrors(result.fieldErrors);
    setRootError(result.rootError);

    if (!result.ok || !result.data) {
      setAttempt((a) => a + 1);
      const invalidKeys = FIELD_ORDER.filter((key) => result.fieldErrors[key]);
      focusFirst(invalidKeys.length > 0 ? invalidKeys : ["monthlyTotal"]);
      return;
    }
    if (saving) return;
    void onNext(result.data);
  };

  const summaryItems =
    FIELD_ORDER.filter((key) => fieldErrors[key]).length > 0
      ? FIELD_ORDER.filter((key) => fieldErrors[key]).map((key) => ({ key, label: FIELD_LABELS[key] }))
      : rootError
        ? [{ key: "monthlyTotal", label: "Budget allocation" }]
        : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-bone md:text-2xl">Monthly marketing budget</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Only shown because you selected an advertising service.
        </p>
      </div>

      <TextField
        label="Monthly marketing budget (₹)"
        required
        type="number"
        value={monthlyTotal}
        onChange={setMonthlyTotal}
        onBlur={() => validateField("monthlyTotal")}
        error={fieldErrors.monthlyTotal}
        fieldRef={register("monthlyTotal")}
        placeholder="e.g., ₹1,00,000"
      />

      <div className="flex flex-col gap-3">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Allocation</p>
        {channels.map((channel) => (
          <TextField
            key={channel.value}
            label={channel.label}
            type="number"
            value={amounts[channel.value] ?? ""}
            onChange={(v) => setAmounts((prev) => ({ ...prev, [channel.value]: v }))}
            onBlur={() => validateField(`allocation.${channel.value}`)}
            error={fieldErrors[`allocation.${channel.value}`]}
            fieldRef={register(`allocation.${channel.value}`)}
            placeholder="e.g., ₹40,000"
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border border-carbon p-4 font-body text-sm">
        <div>
          <p className="text-xs text-ash">Total</p>
          <p className="text-bone">{formatINR(totalNum)}</p>
        </div>
        <div>
          <p className="text-xs text-ash">Allocated</p>
          <p className="text-bone">{formatINR(allocatedNum)}</p>
        </div>
        <div>
          <p className="text-xs text-ash">Remaining</p>
          <p className={remainingNum < 0 ? "text-smash-text" : "text-bone"}>{formatINR(remainingNum)}</p>
        </div>
      </div>

      {saveMessage && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
      )}

      <ValidationSummary
        key={attempt}
        items={summaryItems}
        onSelect={(key) => focusFirst([key])}
        title={rootError ?? undefined}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm text-ash hover:text-bone focus-visible:-outline-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          aria-busy={saving}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {saving ? "Saving" : "Continue"}
        </button>
      </div>
    </div>
  );
}
