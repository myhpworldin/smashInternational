import {
  companySchema,
  objectivesSchema,
  targetAudienceSchema,
  brandProfileSchema,
  budgetSchema,
  validateServiceResponses,
  type ServiceResponseEntry,
} from "@/shared/validation/onboarding";
import { selectedServicesNeedBrandProfile, selectedServicesNeedBudget } from "@/shared/config/services";

export type OnboardingDraftShape = {
  selectedServiceIds?: string[];
  serviceResponses?: ServiceResponseEntry[];
  brandProfile?: unknown;
  company?: unknown;
  objectives?: unknown;
  targetAudience?: unknown;
  budget?: unknown;
};

export const ALL_ONBOARDING_STEPS = ["services", "requirements", "company", "objectives", "audience", "budget"] as const;
export type OnboardingStepId = (typeof ALL_ONBOARDING_STEPS)[number];

// The step list actually shown depends on what's selected — "budget" only
// applies when an advertising service that needs it is selected (see
// selectedServicesNeedBudget). Never a fixed list, and never a fixed
// percentage denominator.
export function getApplicableSteps(draft: OnboardingDraftShape): OnboardingStepId[] {
  const steps: OnboardingStepId[] = ["services", "requirements", "company", "objectives", "audience"];
  if (selectedServicesNeedBudget(draft.selectedServiceIds ?? [])) {
    steps.push("budget");
  }
  return steps;
}

export function isServicesStepComplete(draft: OnboardingDraftShape): boolean {
  return Boolean(draft.selectedServiceIds && draft.selectedServiceIds.length > 0);
}

export function isRequirementsStepComplete(draft: OnboardingDraftShape): boolean {
  const selectedIds = draft.selectedServiceIds ?? [];
  if (selectedIds.length === 0) return false;

  const responses = draft.serviceResponses ?? [];
  if (validateServiceResponses(selectedIds, responses).length > 0) return false;

  const respondedIds = new Set(responses.map((r) => r.serviceId));
  if (!selectedIds.every((id) => respondedIds.has(id))) return false;

  if (selectedServicesNeedBrandProfile(selectedIds)) {
    return brandProfileSchema.safeParse(draft.brandProfile).success;
  }

  return true;
}

export function isCompanyStepComplete(draft: OnboardingDraftShape): boolean {
  return companySchema.safeParse(draft.company).success;
}

export function isObjectivesStepComplete(draft: OnboardingDraftShape): boolean {
  return objectivesSchema.safeParse(draft.objectives).success;
}

export function isAudienceStepComplete(draft: OnboardingDraftShape): boolean {
  return targetAudienceSchema.safeParse(draft.targetAudience).success;
}

export function isBudgetStepComplete(draft: OnboardingDraftShape): boolean {
  if (!selectedServicesNeedBudget(draft.selectedServiceIds ?? [])) return true;
  return budgetSchema.safeParse(draft.budget).success;
}

const COMPLETENESS_CHECKS: Record<OnboardingStepId, (draft: OnboardingDraftShape) => boolean> = {
  services: isServicesStepComplete,
  requirements: isRequirementsStepComplete,
  company: isCompanyStepComplete,
  objectives: isObjectivesStepComplete,
  audience: isAudienceStepComplete,
  budget: isBudgetStepComplete,
};

export function stepCompleteness(draft: OnboardingDraftShape): Record<OnboardingStepId, boolean> {
  return {
    services: isServicesStepComplete(draft),
    requirements: isRequirementsStepComplete(draft),
    company: isCompanyStepComplete(draft),
    objectives: isObjectivesStepComplete(draft),
    audience: isAudienceStepComplete(draft),
    budget: isBudgetStepComplete(draft),
  };
}

// First applicable step that isn't complete yet, or "summary" once every
// applicable step is done. Summary itself carries no required fields, so
// it's never counted toward the percentage — see OnboardingProgress usage.
export function firstIncompleteApplicableStep(draft: OnboardingDraftShape): OnboardingStepId | "summary" {
  const applicable = getApplicableSteps(draft);
  const firstIncomplete = applicable.find((id) => !COMPLETENESS_CHECKS[id](draft));
  return firstIncomplete ?? "summary";
}

// The same real, schema-derived completeness used to drive the client
// wizard's own progress bar — reused here (isomorphic, no server-only
// imports) so the admin list's percentage can never disagree with what the
// client actually sees.
export function completionPercent(draft: OnboardingDraftShape): number {
  const applicable = getApplicableSteps(draft);
  const completedCount = applicable.filter((id) => COMPLETENESS_CHECKS[id](draft)).length;
  return Math.round((completedCount / applicable.length) * 100);
}
