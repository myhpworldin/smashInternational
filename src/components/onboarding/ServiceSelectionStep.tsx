"use client";

import { useState } from "react";
import { SERVICE_CATEGORIES, SERVICES } from "@/shared/config/services";

type ServiceSelectionStepProps = {
  initialValue: string[];
  onNext: (value: string[]) => Promise<void>;
  saving: boolean;
  saveMessage: string | null;
};

export default function ServiceSelectionStep({
  initialValue,
  onNext,
  saving,
  saveMessage,
}: ServiceSelectionStepProps) {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [touched, setTouched] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleContinue = () => {
    setTouched(true);
    if (selected.length === 0 || saving) return;
    void onNext(selected);
  };

  const showEmptyError = touched && selected.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-bone md:text-2xl">
          What services do you need from SMASH?
        </h1>
        <p className="mt-1 font-body text-sm text-ash">
          Select every service you&apos;d like us to handle. You can select more than one.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {SERVICE_CATEGORIES.map((category) => (
          <div key={category.id} className="flex flex-col gap-2">
            <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">
              {category.label}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SERVICES.filter((s) => s.category === category.id).map((service) => {
                const isSelected = selected.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(service.id)}
                    className={`rounded-none border px-4 py-3 text-left font-body text-sm transition-colors duration-150 focus-visible:-outline-offset-2 ${
                      isSelected
                        ? "border-smash bg-smash-dim text-bone"
                        : "border-carbon bg-carbon text-bone hover:border-ash"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      {service.label}
                      {isSelected && (
                        <span aria-hidden="true" className="text-smash-text">
                          ✓
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-body text-xs text-ash">
          {selected.length} service{selected.length === 1 ? "" : "s"} selected
        </p>
        {showEmptyError && (
          <p role="alert" className="font-body text-xs text-smash-text">
            Select at least one service to continue.
          </p>
        )}
        {saveMessage && (
          <p role="alert" className="font-body text-xs text-smash-text">
            {saveMessage}
          </p>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          aria-busy={saving}
          className="w-full rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2 sm:w-auto"
        >
          {saving ? "Saving" : "Continue"}
        </button>
      </div>
    </div>
  );
}
