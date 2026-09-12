"use client";

import { useMemo, useState } from "react";
import {
  getServiceById,
  selectedServicesNeedBrandProfile,
  selectedServicesNeedAssets,
} from "@/shared/config/services";
import { brandProfileSchema, validateServiceResponses } from "@/shared/validation/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";
import ServiceFieldRenderer from "@/components/onboarding/ServiceFieldRenderer";
import BrandProfileSection from "@/components/onboarding/BrandProfileSection";
import AssetsPanel from "@/components/onboarding/AssetsPanel";

type ServiceResponseEntry = { serviceId: string; responses: Record<string, unknown> };

type ServiceRequirementsStepProps = {
  selectedServiceIds: string[];
  initialServiceResponses: ServiceResponseEntry[];
  initialBrandProfile: Record<string, unknown> | null;
  onNext: (value: {
    serviceResponses: ServiceResponseEntry[];
    brandProfile?: Record<string, unknown>;
  }) => Promise<void>;
  onBack: () => void;
  onEditServices: () => void;
  saving: boolean;
  saveMessage: string | null;
};

function initialResponsesByService(
  selectedServiceIds: string[],
  existing: ServiceResponseEntry[],
): Record<string, Record<string, unknown>> {
  const existingByService = new Map(existing.map((e) => [e.serviceId, e.responses]));
  const result: Record<string, Record<string, unknown>> = {};
  for (const id of selectedServiceIds) {
    // Deselected services' old data is simply never read back in here —
    // it stays out of storage the next save (see saveDraft's pruning).
    result[id] = existingByService.get(id) ?? {};
  }
  return result;
}

export default function ServiceRequirementsStep({
  selectedServiceIds,
  initialServiceResponses,
  initialBrandProfile,
  onNext,
  onBack,
  onEditServices,
  saving,
  saveMessage,
}: ServiceRequirementsStepProps) {
  const [responsesByService, setResponsesByService] = useState(() =>
    initialResponsesByService(selectedServiceIds, initialServiceResponses),
  );
  const [brandProfile, setBrandProfile] = useState<Record<string, unknown>>(
    () => initialBrandProfile ?? {},
  );
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [brandErrors, setBrandErrors] = useState<Record<string, string>>({});

  const needsBrandProfile = selectedServicesNeedBrandProfile(selectedServiceIds);
  const needsAssets = selectedServicesNeedAssets(selectedServiceIds);

  const services = useMemo(
    () => selectedServiceIds.map((id) => getServiceById(id)).filter((s) => s !== undefined),
    [selectedServiceIds],
  );

  const setFieldValue = (serviceId: string, key: string, value: unknown) => {
    setResponsesByService((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [key]: value },
    }));
  };

  const errorsForService = (serviceId: string) =>
    generalErrors.filter((e) => e.startsWith(`${serviceId}:`));

  const handleContinue = () => {
    const entries: ServiceResponseEntry[] = selectedServiceIds.map((id) => ({
      serviceId: id,
      responses: responsesByService[id] ?? {},
    }));

    const serviceErrors = validateServiceResponses(selectedServiceIds, entries);

    let brandOk = true;
    let nextBrandErrors: Record<string, string> = {};
    if (needsBrandProfile) {
      const parsed = brandProfileSchema.safeParse(brandProfile);
      if (!parsed.success) {
        brandOk = false;
        nextBrandErrors = issuesToFieldErrors(parsed.error.issues);
      }
    }

    setGeneralErrors(serviceErrors);
    setBrandErrors(nextBrandErrors);

    if (serviceErrors.length > 0 || !brandOk || saving) return;

    void onNext({
      serviceResponses: entries,
      ...(needsBrandProfile ? { brandProfile } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-bone md:text-2xl">Service requirements</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Only the details relevant to what you selected.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Selected services</p>
        <ul className="flex flex-col gap-1">
          {services.map((service) => (
            <li key={service!.id} className="font-body text-sm text-bone">
              <span className="text-smash-text">✓</span> {service!.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onEditServices}
          className="self-start font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
        >
          Change services
        </button>
      </div>

      {needsBrandProfile && (
        <BrandProfileSection value={brandProfile} onChange={setBrandProfile} errors={brandErrors} />
      )}

      {needsAssets && <AssetsPanel />}

      {services.map((service) => (
        <div key={service!.id} className="flex flex-col gap-4 border border-carbon p-4">
          <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{service!.label}</h3>
          {service!.fields.map((field) => (
            <ServiceFieldRenderer
              key={field.key}
              field={field}
              value={responsesByService[service!.id]?.[field.key]}
              onChange={(v) => setFieldValue(service!.id, field.key, v)}
            />
          ))}
          {errorsForService(service!.id).map((err) => (
            <p key={err} role="alert" className="font-body text-xs text-smash-text">
              {err}
            </p>
          ))}
        </div>
      ))}

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
