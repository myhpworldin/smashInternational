"use client";

import { useState } from "react";
import TextField from "@/components/form/fields/TextField";
import { getApplicableBudgetChannels } from "@/shared/config/services";
import { budgetSchema, type BudgetInput } from "@/shared/validation/onboarding";
import { formatINR } from "@/lib/format/currency";

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
  const [error, setError] = useState<string | null>(null);

  const totalNum = Number(monthlyTotal) || 0;
  const allocatedNum = channels.reduce((sum, c) => sum + (Number(amounts[c.value]) || 0), 0);
  const remainingNum = totalNum - allocatedNum;

  const handleContinue = () => {
    const allocations = channels
      .map((c) => ({ channel: c.value, amount: Number(amounts[c.value]) || 0 }))
      .filter((a) => a.amount > 0);

    const parsed = budgetSchema.safeParse({ monthlyTotal: totalNum, allocations });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the budget details and try again.");
      return;
    }
    setError(null);
    if (saving) return;
    void onNext(parsed.data);
  };

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

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      {saveMessage && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
      )}

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
