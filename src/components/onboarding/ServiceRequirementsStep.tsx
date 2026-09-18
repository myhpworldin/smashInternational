"use client";

import { useMemo, useState } from "react";
import {
  getServiceById,
  isFieldActive,
  selectedServicesNeedBrandProfile,
  selectedServicesNeedAssets,
  type ServiceDef,
} from "@/shared/config/services";
import { brandProfileSchema, validateServiceResponses } from "@/shared/validation/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";
import ServiceFieldRenderer from "@/components/onboarding/ServiceFieldRenderer";
import BrandProfileSection from "@/components/onboarding/BrandProfileSection";
import AssetsPanel from "@/components/onboarding/AssetsPanel";
import { useFieldRegistry } from "@/lib/form/useFieldRegistry";
import ValidationSummary, { type ValidationSummaryItem } from "@/components/form/ValidationSummary";
import SaveStatusIndicator from "@/components/form/SaveStatusIndicator";
import type { SaveStatus } from "@/store/useOnboardingDraftStore";
import { readSectionCacheIfNewer } from "@/lib/onboarding/draftCache";
import { useDraftCacheSync } from "@/lib/onboarding/useDraftCacheSync";
import { useOpportunisticAutosave } from "@/lib/onboarding/useOpportunisticAutosave";

type ServiceResponseEntry = { serviceId: string; responses: Record<string, unknown> };

const BRAND_FIELD_ORDER = [
  "brandStory",
  "brandPositioning",
  "toneOfVoice",
  "keyProductsServices",
  "usps",
  "competitors",
] as const;
const BRAND_FIELD_LABELS: Record<(typeof BRAND_FIELD_ORDER)[number], string> = {
  brandStory: "Brand story",
  brandPositioning: "Brand positioning",
  toneOfVoice: "Tone of voice",
  keyProductsServices: "Key products / services",
  usps: "USPs",
  competitors: "Competitors",
};

// Parses validateServiceResponses' flat, prefix-routed error strings
// ("serviceId.fieldKey: ...", "serviceId.fieldKey[i].subKey: ...",
// "serviceId: ...") into one summary item per distinct field — the same
// format fieldErrorFor/entryErrorFor below already rely on for routing, just
// read once more here to build human labels instead of a route.
function parseServiceErrorItems(generalErrors: string[], services: ServiceDef[]): ValidationSummaryItem[] {
  const items: ValidationSummaryItem[] = [];
  const seen = new Set<string>();

  for (const raw of generalErrors) {
    const colonIdx = raw.indexOf(":");
    const path = colonIdx === -1 ? raw : raw.slice(0, colonIdx);
    const dotIdx = path.indexOf(".");
    const serviceId = dotIdx === -1 ? path : path.slice(0, dotIdx);
    const service = services.find((s) => s.id === serviceId);
    if (!service) continue;

    if (dotIdx === -1) {
      if (seen.has(serviceId)) continue;
      seen.add(serviceId);
      items.push({ key: serviceId, label: service.label });
      continue;
    }

    const rest = path.slice(dotIdx + 1);
    const groupMatch = rest.match(/^(.+?)\[(\d+)\]\.(.+)$/);
    if (groupMatch) {
      const [, fieldKey, idxStr, subKey] = groupMatch;
      const field = service.fields.find((f) => f.key === fieldKey);
      const subField = field?.groupFields?.find((f) => f.key === subKey);
      const key = `${serviceId}.${fieldKey}[${idxStr}].${subKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key,
        label: `${service.label} — ${field?.entryLabel ?? field?.label ?? fieldKey} ${Number(idxStr) + 1} — ${subField?.label ?? subKey}`,
      });
      continue;
    }

    const field = service.fields.find((f) => f.key === rest);
    const key = `${serviceId}.${rest}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ key, label: `${service.label} — ${field?.label ?? rest}` });
  }

  return items;
}

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
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onboardingId: string;
  serverUpdatedAt: string;
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
  saveStatus,
  saveMessage,
  onboardingId,
  serverUpdatedAt,
}: ServiceRequirementsStepProps) {
  const [responsesByService, setResponsesByService] = useState(() => {
    const cached = readSectionCacheIfNewer<Record<string, Record<string, unknown>>>(
      onboardingId,
      "serviceResponses",
      serverUpdatedAt,
    );
    const base = cached ?? initialResponsesByService(selectedServiceIds, initialServiceResponses);
    // Re-intersected with the currently selected services regardless of
    // where `base` came from — a service removed since this snapshot was
    // written must not resurrect its old responses (the same rule
    // saveDraft already enforces server-side for the real save).
    const filtered: Record<string, Record<string, unknown>> = {};
    for (const id of selectedServiceIds) {
      filtered[id] = base[id] ?? {};
    }
    return filtered;
  });
  const [brandProfile, setBrandProfile] = useState<Record<string, unknown>>(() => {
    const cached = readSectionCacheIfNewer<Record<string, unknown>>(onboardingId, "brandProfile", serverUpdatedAt);
    return cached ?? initialBrandProfile ?? {};
  });
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [brandErrors, setBrandErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  useDraftCacheSync(onboardingId, "serviceResponses", responsesByService);
  useDraftCacheSync(onboardingId, "brandProfile", brandProfile);

  const needsBrandProfile = selectedServicesNeedBrandProfile(selectedServiceIds);
  const needsAssets = selectedServicesNeedAssets(selectedServiceIds);

  const services = useMemo(
    () => selectedServiceIds.map((id) => getServiceById(id)).filter((s): s is ServiceDef => s !== undefined),
    [selectedServiceIds],
  );

  // Visual top-to-bottom order of every possible field key (brand profile,
  // then each service's own fields/entries, then a service-level fallback) —
  // used to pick the *first* invalid field regardless of which ones actually
  // have errors right now. focusFirst silently skips any key that isn't
  // currently mounted (e.g. a groupList entry that doesn't exist yet), so
  // it's safe to list keys generously rather than re-deriving exactly what's
  // rendered.
  const orderedFieldKeys = useMemo(() => {
    const keys: string[] = [];
    if (needsBrandProfile) {
      keys.push(...BRAND_FIELD_ORDER.map((k) => `brand.${k}`));
    }
    for (const service of services) {
      for (const field of service.fields) {
        if (field.type === "groupList") {
          const entries = responsesByService[service.id]?.[field.key];
          const count = Array.isArray(entries) ? entries.length : 0;
          for (let i = 0; i < count; i++) {
            for (const subField of field.groupFields ?? []) {
              keys.push(`${service.id}.${field.key}[${i}].${subField.key}`);
            }
          }
          keys.push(`${service.id}.${field.key}`);
        } else {
          keys.push(`${service.id}.${field.key}`);
        }
      }
      keys.push(service.id);
    }
    return keys;
  }, [needsBrandProfile, services, responsesByService]);

  const setFieldValue = (serviceId: string, key: string, value: unknown) => {
    setResponsesByService((prev) => {
      const nextResponses = { ...prev[serviceId], [key]: value };

      // Changing a controlling field (e.g. "Has an existing website") can
      // hide a dependent field — drop its stale value so it isn't silently
      // carried forward (and re-validated) once it's no longer shown.
      const service = getServiceById(serviceId);
      for (const field of service?.fields ?? []) {
        if (field.dependsOn?.key === key && !isFieldActive(field, nextResponses)) {
          delete nextResponses[field.key];
        }
      }

      return { ...prev, [serviceId]: nextResponses };
    });
  };

  // Field-level errors are formatted as "serviceId.fieldKey: ..." so they can
  // be routed to the exact field that failed instead of being dumped under
  // the whole service card (where they'd visually attach to whichever field
  // happens to render last).
  const fieldErrorFor = (serviceId: string, fieldKey: string) => {
    const prefix = `${serviceId}.${fieldKey}:`;
    const raw = generalErrors.find((e) => e.startsWith(prefix));
    if (!raw) return undefined;
    // Strip the routing prefix and the redundant field label — FieldShell
    // already renders the label, so the error only needs to add "is
    // required" / "has an invalid value".
    return raw.slice(prefix.length).replace(/\s*".*?"\s*/, " ").trim();
  };

  // Routes a groupList entry's sub-field error (formatted as
  // "serviceId.fieldKey[index].subKey: ...") to that exact entry/control,
  // mirroring fieldErrorFor's prefix-based routing for flat fields.
  const entryErrorFor = (serviceId: string, fieldKey: string, entryIndex: number, subKey: string) => {
    const prefix = `${serviceId}.${fieldKey}[${entryIndex}].${subKey}:`;
    const raw = generalErrors.find((e) => e.startsWith(prefix));
    if (!raw) return undefined;
    return raw.slice(prefix.length).replace(/\s*".*?"\s*/, " ").trim();
  };

  const serviceLevelErrorsFor = (serviceId: string) =>
    generalErrors.filter((e) => e.startsWith(`${serviceId}:`) && !e.startsWith(`${serviceId}.`));

  const currentEntries = (): ServiceResponseEntry[] =>
    selectedServiceIds.map((id) => ({ serviceId: id, responses: responsesByService[id] ?? {} }));

  // Re-runs the full (imperative, data-driven) service validator, but only
  // replaces the slice of `generalErrors` whose routing prefix matches this
  // one field/entry — every other field's last-known error stays as-is,
  // mirroring the narrow per-field update the static steps do with zod.
  const validateFieldOnBlur = (prefix: string) => {
    const allErrors = validateServiceResponses(selectedServiceIds, currentEntries());
    const matching = allErrors.filter((e) => e.startsWith(prefix));
    setGeneralErrors((prev) => [...prev.filter((e) => !e.startsWith(prefix)), ...matching]);
  };

  const validateBrandField = (key: string) => {
    const parsed = brandProfileSchema.safeParse(brandProfile);
    const fieldErrors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues);
    setBrandErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[key]) next[key] = fieldErrors[key];
      else delete next[key];
      return next;
    });
  };

  const handleContinue = () => {
    const entries = currentEntries();

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

    if (serviceErrors.length > 0 || !brandOk || saving) {
      if (serviceErrors.length > 0 || !brandOk) {
        setAttempt((a) => a + 1);
        focusFirst(orderedFieldKeys);
      }
      return;
    }

    void onNext({
      serviceResponses: entries,
      ...(needsBrandProfile ? { brandProfile } : {}),
    });
  };

  const summaryItems: ValidationSummaryItem[] = [
    ...BRAND_FIELD_ORDER.filter((k) => brandErrors[k]).map((k) => ({
      key: `brand.${k}`,
      label: BRAND_FIELD_LABELS[k],
    })),
    ...parseServiceErrorItems(generalErrors, services),
  ];

  const entriesForAutosave = currentEntries();
  const serviceErrorsForAutosave = validateServiceResponses(selectedServiceIds, entriesForAutosave);
  useOpportunisticAutosave(
    onboardingId,
    serviceErrorsForAutosave.length === 0 ? { serviceResponses: entriesForAutosave } : null,
  );

  const brandParsedForAutosave = needsBrandProfile ? brandProfileSchema.safeParse(brandProfile) : null;
  useOpportunisticAutosave(
    onboardingId,
    brandParsedForAutosave?.success ? { brandProfile: brandParsedForAutosave.data } : null,
  );

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
            <li key={service.id} className="font-body text-sm text-bone">
              <span className="text-smash-text">✓</span> {service.label}
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
        <BrandProfileSection
          value={brandProfile}
          onChange={setBrandProfile}
          errors={brandErrors}
          onBlurField={validateBrandField}
          registerField={(key) => register(`brand.${key}`)}
        />
      )}

      {needsAssets && <AssetsPanel />}

      {services.map((service) => (
        <div key={service.id} ref={register(service.id)} className="flex flex-col gap-4 border border-carbon p-4">
          <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{service.label}</h3>
          {service.fields
            .filter((field) => isFieldActive(field, responsesByService[service.id] ?? {}))
            .map((field) => (
              <ServiceFieldRenderer
                key={field.key}
                field={field}
                value={responsesByService[service.id]?.[field.key]}
                onChange={(v) => setFieldValue(service.id, field.key, v)}
                onBlur={() => validateFieldOnBlur(`${service.id}.${field.key}:`)}
                fieldRef={register(`${service.id}.${field.key}`)}
                error={fieldErrorFor(service.id, field.key)}
                errorFor={(entryIndex, subKey) => entryErrorFor(service.id, field.key, entryIndex, subKey)}
                registerEntry={(entryIndex, subKey) =>
                  register(`${service.id}.${field.key}[${entryIndex}].${subKey}`)
                }
                onBlurEntry={(entryIndex, subKey) =>
                  validateFieldOnBlur(`${service.id}.${field.key}[${entryIndex}].${subKey}:`)
                }
              />
            ))}
          {serviceLevelErrorsFor(service.id).map((err) => (
            <p key={err} role="alert" className="font-body text-xs text-smash-text">
              {err}
            </p>
          ))}
        </div>
      ))}

      {saveMessage ? (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
      ) : (
        <SaveStatusIndicator status={saveStatus} />
      )}

      <ValidationSummary key={attempt} items={summaryItems} onSelect={(key) => focusFirst([key])} />

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
