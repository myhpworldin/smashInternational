import * as z from "zod/mini";
import {
  getServiceById,
  isValidServiceId,
  selectedServicesNeedBrandProfile,
  selectedServicesNeedBudget,
} from "@/shared/config/services";
import { MAX_ASSET_SIZE_BYTES, type AgeGroup, type AssetType, type BusinessObjective, type Gender } from "@/shared/types/onboarding";

const AGE_GROUP_VALUES = ["18_24", "25_34", "35_44", "45_54", "55_plus"] as const;
const GENDER_VALUES = ["male", "female", "other", "all"] as const;
const CUSTOMER_TYPE_VALUES = ["b2b", "b2c", "both"] as const;
const OBJECTIVE_VALUES = [
  "brand_awareness",
  "leads",
  "sales",
  "website_traffic",
  "app_downloads",
  "store_visits",
  "other",
] as const;
const ASSET_TYPE_VALUES = [
  "logo",
  "brand_guidelines",
  "product_images",
  "videos",
  "existing_creatives",
  "brochures",
  "catalogues",
] as const;

const MAX_TAG_ARRAY_LENGTH = 50;

// Used both for companySchema.website and for the catalog's generic "url"
// field type (see fieldValueLooksValid) — accepts http(s) URLs only.
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Permissive on purpose (international formats, spacing, punctuation) but
// rejects obvious garbage — letters, script fragments — that a phone/
// WhatsApp field should never contain.
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,19}$/;

export const companySchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  industry: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
  description: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  website: z.optional(
    z
      .string()
      .check(z.trim(), z.maxLength(300))
      .check(z.refine((v) => v === "" || isValidUrl(v), "Enter a valid URL")),
  ),
  locations: z
    .array(z.string().check(z.trim(), z.minLength(1), z.maxLength(200)))
    .check(z.maxLength(MAX_TAG_ARRAY_LENGTH)),
  contactPerson: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  designation: z.optional(z.string().check(z.trim(), z.maxLength(100))),
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
  phone: z
    .string()
    .check(z.trim(), z.minLength(1), z.maxLength(30))
    .check(z.refine((v) => PHONE_PATTERN.test(v), "Enter a valid phone number")),
  whatsapp: z.optional(
    z
      .string()
      .check(z.trim(), z.maxLength(30))
      .check(z.refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number")),
  ),
});

export const objectivesSchema = z
  .object({
    selected: z.array(z.enum(OBJECTIVE_VALUES)).check(z.minLength(1)),
    otherDetail: z.optional(z.string().check(z.trim(), z.maxLength(300))),
  })
  .check(
    z.refine((val) => {
      if (!val.selected.includes("other")) return true;
      return Boolean(val.otherDetail && val.otherDetail.length > 0);
    }, "otherDetail is required when \"other\" is selected"),
  );

export const targetAudienceSchema = z.object({
  ageGroups: z.array(z.enum(AGE_GROUP_VALUES)),
  gender: z.array(z.enum(GENDER_VALUES)),
  locations: z
    .array(z.string().check(z.trim(), z.minLength(1), z.maxLength(200)))
    .check(z.maxLength(MAX_TAG_ARRAY_LENGTH)),
  customerType: z.enum(CUSTOMER_TYPE_VALUES),
  interests: z
    .array(z.string().check(z.trim(), z.minLength(1), z.maxLength(100)))
    .check(z.maxLength(MAX_TAG_ARRAY_LENGTH)),
  existingCustomerProfile: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
});

// 10 crore (₹100,000,000) — generous for this business, but bounded rather
// than accepting an arbitrary finite number a client could type in.
const MAX_BUDGET_AMOUNT = 100_000_000;

export const budgetAllocationSchema = z.object({
  channel: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
  amount: z.number().check(z.gte(0), z.lte(MAX_BUDGET_AMOUNT)),
});

export const budgetSchema = z
  .object({
    monthlyTotal: z.number().check(z.gte(0), z.lte(MAX_BUDGET_AMOUNT)),
    allocations: z.array(budgetAllocationSchema).check(z.maxLength(20)),
  })
  .check(
    z.refine((val) => {
      const allocated = val.allocations.reduce((sum, a) => sum + a.amount, 0);
      return allocated <= val.monthlyTotal;
    }, "Allocated amount cannot exceed the monthly budget"),
  );

// Shared by every service that "reuses common brand information" instead of
// re-asking for it (see requiresBrandProfile in shared/config/services.ts).
export const brandProfileSchema = z.object({
  brandStory: z.string().check(z.trim(), z.minLength(1), z.maxLength(2000)),
  brandPositioning: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  toneOfVoice: z.optional(z.string().check(z.trim(), z.maxLength(200))),
  keyProductsServices: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  usps: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  competitors: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

export const assetMetadataSchema = z.object({
  assetType: z.enum(ASSET_TYPE_VALUES),
  originalFilename: z.string().check(z.trim(), z.minLength(1), z.maxLength(255)),
  mimeType: z.string().check(z.trim(), z.minLength(1), z.maxLength(127)),
  sizeBytes: z.number().check(z.gt(0), z.lte(MAX_ASSET_SIZE_BYTES)),
});

// Partial — a draft can be saved incomplete. Each section, when present,
// must still be fully valid; required-field completeness for the whole
// onboarding record is only enforced by validateForSubmission below.
export const onboardingDraftSchema = z.object({
  company: z.optional(companySchema),
  objectives: z.optional(objectivesSchema),
  targetAudience: z.optional(targetAudienceSchema),
  selectedServiceIds: z.optional(z.array(z.string())),
  serviceResponses: z.optional(
    z.array(
      z.object({
        serviceId: z.string(),
        responses: z.record(z.string(), z.unknown()),
      }),
    ),
  ),
  budget: z.optional(budgetSchema),
  brandProfile: z.optional(brandProfileSchema),
});

export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type ObjectivesInput = z.infer<typeof objectivesSchema>;
export type TargetAudienceInput = z.infer<typeof targetAudienceSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type AssetMetadataInput = z.infer<typeof assetMetadataSchema>;

export type ServiceResponseEntry = { serviceId: string; responses: Record<string, unknown> };

// Never trust client-submitted service ids or response shapes — cross-check
// against the code catalog (shared/config/services.ts) on every write.
export function validateSelectedServiceIds(ids: string[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (!isValidServiceId(id)) {
      errors.push(`Unknown service id: ${id}`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`Duplicate service id: ${id}`);
      continue;
    }
    seen.add(id);
  }

  return errors;
}

const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_SERVICE_NUMBER = 1_000_000;

// Every field type the dynamic service-form engine supports (see
// shared/config/services.ts) gets a real bound here — the catalog only
// declares a field's *shape* (text vs number vs select…), so this is the
// one place that shape becomes an actual size/format/range limit. Without
// these, a "textarea" field would accept an unbounded string and a
// "number" field would accept a negative or absurdly large value, no
// matter what the frontend's own input widget nudges toward.
function fieldValueLooksValid(type: string, value: unknown, options?: { value: string }[]): boolean {
  switch (type) {
    case "text":
      return typeof value === "string" && value.length <= MAX_SHORT_TEXT_LENGTH;
    case "textarea":
      return typeof value === "string" && value.length <= MAX_LONG_TEXT_LENGTH;
    case "url":
      return typeof value === "string" && value.length <= MAX_SHORT_TEXT_LENGTH && isValidUrl(value);
    case "number":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= MAX_SERVICE_NUMBER
      );
    case "boolean":
      return typeof value === "boolean";
    case "select":
      return typeof value === "string" && (options ?? []).some((o) => o.value === value);
    case "multiselect":
      return (
        Array.isArray(value) &&
        value.length <= MAX_TAG_ARRAY_LENGTH &&
        value.every((v) => typeof v === "string" && (options ?? []).some((o) => o.value === v))
      );
    case "tags":
      return (
        Array.isArray(value) &&
        value.length <= MAX_TAG_ARRAY_LENGTH &&
        value.every((v) => typeof v === "string" && v.length > 0 && v.length <= MAX_SHORT_TEXT_LENGTH)
      );
    default:
      return false;
  }
}

export function validateServiceResponses(
  selectedServiceIds: string[],
  entries: ServiceResponseEntry[],
): string[] {
  const errors: string[] = [];
  const selectedSet = new Set(selectedServiceIds);

  for (const entry of entries) {
    if (!selectedSet.has(entry.serviceId)) {
      errors.push(`Response given for unselected service: ${entry.serviceId}`);
      continue;
    }

    const service = getServiceById(entry.serviceId);
    if (!service) {
      errors.push(`Unknown service id: ${entry.serviceId}`);
      continue;
    }

    for (const field of service.fields) {
      const value = entry.responses[field.key];

      if (value === undefined || value === null || value === "") {
        if (field.required) {
          errors.push(`${entry.serviceId}: "${field.label}" is required`);
        }
        continue;
      }

      if (!fieldValueLooksValid(field.type, value, field.options)) {
        errors.push(`${entry.serviceId}: "${field.label}" has an invalid value`);
      }
    }

    // Reject keys that aren't part of this service's field definition —
    // otherwise arbitrary attacker-supplied keys accumulate in the document.
    const knownKeys = new Set(service.fields.map((f) => f.key));
    for (const key of Object.keys(entry.responses)) {
      if (!knownKeys.has(key)) {
        errors.push(`${entry.serviceId}: unknown field "${key}"`);
      }
    }
  }

  return errors;
}

// Full-completeness check, run only when a client attempts to submit
// (transition draft -> submitted). A draft may be saved without passing this.
export function validateForSubmission(draft: {
  company?: unknown;
  objectives?: unknown;
  targetAudience?: unknown;
  selectedServiceIds?: string[];
  serviceResponses?: ServiceResponseEntry[];
  budget?: unknown;
  brandProfile?: unknown;
}): string[] {
  const errors: string[] = [];

  if (!companySchema.safeParse(draft.company).success) {
    errors.push("Company details are incomplete.");
  }
  if (!objectivesSchema.safeParse(draft.objectives).success) {
    errors.push("Business objectives are incomplete.");
  }
  if (!targetAudienceSchema.safeParse(draft.targetAudience).success) {
    errors.push("Target audience is incomplete.");
  }
  if (!draft.selectedServiceIds || draft.selectedServiceIds.length === 0) {
    errors.push("Select at least one service.");
  }

  if (draft.selectedServiceIds) {
    errors.push(...validateSelectedServiceIds(draft.selectedServiceIds));
    errors.push(...validateServiceResponses(draft.selectedServiceIds, draft.serviceResponses ?? []));

    const respondedIds = new Set((draft.serviceResponses ?? []).map((r) => r.serviceId));
    for (const id of draft.selectedServiceIds) {
      if (!respondedIds.has(id)) {
        errors.push(`Requirements missing for selected service: ${id}`);
      }
    }

    if (
      selectedServicesNeedBrandProfile(draft.selectedServiceIds) &&
      !brandProfileSchema.safeParse(draft.brandProfile).success
    ) {
      errors.push("Brand profile is incomplete.");
    }

    // Budget is only a required section when an advertising service that
    // needs it is selected — not a general/forced field otherwise.
    if (
      selectedServicesNeedBudget(draft.selectedServiceIds) &&
      !budgetSchema.safeParse(draft.budget).success
    ) {
      errors.push("Budget details are incomplete.");
    }
  }

  return errors;
}

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["approved", "changes_requested"]),
    notes: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  })
  .check(
    z.refine((val) => {
      if (val.decision !== "changes_requested") return true;
      return Boolean(val.notes && val.notes.length > 0);
    }, "A reason is required when requesting changes"),
  );

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

export type { AgeGroup, AssetType, BusinessObjective, Gender };
