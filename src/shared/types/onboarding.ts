export type OnboardingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "changes_requested";

// "submitted" and "under_review" are both surfaced to the client as
// "Under Review" — admins distinguish them (submitted = not yet opened,
// under_review = an admin has started reviewing it).
export const ONBOARDING_CLIENT_LABEL: Record<OnboardingStatus, string> = {
  draft: "Draft",
  submitted: "Under Review",
  under_review: "Under Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
};

// Admins need to tell "submitted" (not yet opened) apart from
// "under_review" (an admin has looked at it) — the client label
// deliberately collapses those two, this one doesn't.
export const ONBOARDING_ADMIN_LABEL: Record<OnboardingStatus, string> = {
  draft: "Draft",
  submitted: "New",
  under_review: "Under Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
};

export const ADMIN_STATUS_FILTERS: { id: OnboardingStatus; label: string }[] = [
  { id: "submitted", label: "New / Submitted" },
  { id: "under_review", label: "Under Review" },
  { id: "approved", label: "Approved" },
  { id: "changes_requested", label: "Changes Requested" },
];

export type BusinessObjective =
  | "brand_awareness"
  | "leads"
  | "sales"
  | "website_traffic"
  | "app_downloads"
  | "store_visits"
  | "other";

export const BUSINESS_OBJECTIVES: { id: BusinessObjective; label: string }[] = [
  { id: "brand_awareness", label: "Brand Awareness" },
  { id: "leads", label: "Leads" },
  { id: "sales", label: "Sales" },
  { id: "website_traffic", label: "Website Traffic" },
  { id: "app_downloads", label: "App Downloads" },
  { id: "store_visits", label: "Store Visits" },
  { id: "other", label: "Other" },
];

export type AgeGroup = "18_24" | "25_34" | "35_44" | "45_54" | "55_plus";

export const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "18_24", label: "18–24" },
  { id: "25_34", label: "25–34" },
  { id: "35_44", label: "35–44" },
  { id: "45_54", label: "45–54" },
  { id: "55_plus", label: "55+" },
];

export type Gender = "male" | "female" | "other" | "all";

export type CustomerType = "b2b" | "b2c" | "both";

export type AssetType =
  | "logo"
  | "brand_guidelines"
  | "product_images"
  | "videos"
  | "existing_creatives"
  | "brochures"
  | "catalogues";

export const ASSET_TYPES: { id: AssetType; label: string }[] = [
  { id: "logo", label: "Logo" },
  { id: "brand_guidelines", label: "Brand Guidelines" },
  { id: "product_images", label: "Product Images" },
  { id: "videos", label: "Videos" },
  { id: "existing_creatives", label: "Existing Creatives" },
  { id: "brochures", label: "Brochures" },
  { id: "catalogues", label: "Catalogues" },
];

export const MAX_ASSET_SIZE_BYTES = 200 * 1024 * 1024;

// What each asset category is allowed to be — checked on both the client
// (immediate feedback) and the server (the actual gate; never trust the
// client's own check).
export const ALLOWED_MIME_BY_ASSET_TYPE: Record<AssetType, string[]> = {
  logo: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  brand_guidelines: ["application/pdf", "image/png", "image/jpeg"],
  product_images: ["image/png", "image/jpeg", "image/webp"],
  videos: ["video/mp4", "video/quicktime", "video/webm"],
  existing_creatives: ["image/png", "image/jpeg", "image/webp", "video/mp4", "application/pdf"],
  brochures: ["application/pdf"],
  catalogues: ["application/pdf"],
};

export function isAllowedAssetMime(assetType: AssetType, mimeType: string): boolean {
  return ALLOWED_MIME_BY_ASSET_TYPE[assetType].includes(mimeType);
}

export type ReviewDecision = "approved" | "changes_requested";
