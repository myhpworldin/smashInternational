// Single source of truth for the onboarding service catalog. Adding or
// changing a service is a code change here — never a database migration —
// because selected services and their responses are validated against this
// list at request time (see shared/validation/onboarding.ts), not against a
// mirrored DB collection.

export type ServiceCategoryId =
  | "digital_marketing"
  | "creative"
  | "technology"
  | "customer_engagement";

export const SERVICE_CATEGORIES: { id: ServiceCategoryId; label: string }[] = [
  { id: "digital_marketing", label: "Digital Marketing" },
  { id: "creative", label: "Creative" },
  { id: "technology", label: "Technology" },
  { id: "customer_engagement", label: "Customer Engagement" },
];

export type ServiceFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "url"
  | "select"
  | "multiselect"
  | "tags" // free-text list, e.g. "other platforms" or "target locations"
  | "groupList"; // repeatable set of sub-fields, e.g. one entry per campaign objective

export type ServiceFieldOption = { value: string; label: string };

export type ServiceFieldDef = {
  key: string;
  label: string;
  type: ServiceFieldType;
  required: boolean;
  options?: ServiceFieldOption[]; // required for "select" | "multiselect"
  // When set, this field is only shown — and its `required` only enforced —
  // once the named field's response strictly equals `equals`. Otherwise it's
  // hidden and any stored value for it is ignored by validation.
  dependsOn?: { key: string; equals: unknown };
  // Required for "groupList" — the fields collected per entry. A groupList's
  // stored value is an array of these sub-field records, one per entry the
  // client adds (e.g. one per campaign objective), rather than a single value.
  groupFields?: ServiceFieldDef[];
  // Singular noun for a groupList's entries, used in UI copy ("Add another
  // campaign", "Campaign 2"). Defaults to the field's own label.
  entryLabel?: string;
  // Beginner-friendly example/guidance shown as the input's placeholder —
  // only meaningful for text-entry types ("text" | "textarea" | "number" |
  // "url" | "tags"); ignored for "boolean" | "select" | "multiselect" |
  // "groupList", which render as chip toggles with no text placeholder.
  placeholder?: string;
};

// True when a field's dependsOn condition (if any) is satisfied by the
// current responses for that service — shared by the UI (what to render)
// and validation (what to enforce as required).
export function isFieldActive(field: ServiceFieldDef, responses: Record<string, unknown>): boolean {
  if (!field.dependsOn) return true;
  return responses[field.dependsOn.key] === field.dependsOn.equals;
}

export type ServiceDef = {
  id: string;
  label: string;
  category: ServiceCategoryId;
  fields: ServiceFieldDef[];
  // Some services share requirement context instead of re-asking for it —
  // brand information and uploaded assets are collected once, in a shared
  // section, and reused by every service that needs them (see
  // shared/onboarding/completeness.ts and ServiceRequirementsStep).
  requiresBrandProfile?: boolean;
  needsAssets?: boolean;
};

// Shared by Social Media Advertising and Google Ads — the source
// documentation describes the same campaign-objective/targeting concepts
// for both, so the field definitions are one array, not two copies.
const CAMPAIGN_OBJECTIVE_OPTIONS: ServiceFieldOption[] = [
  { value: "leads", label: "Leads" },
  { value: "sales", label: "Sales" },
  { value: "website_traffic", label: "Website Traffic" },
  { value: "awareness", label: "Awareness" },
  { value: "app_promotion", label: "App Promotion" },
];

// Per-objective details — one full set of these per entry in the
// "campaigns" groupList below, so a client running both a Leads campaign
// and a Sales campaign can give each its own product, audience, etc.
// instead of one flat set of fields shared across every objective.
const CAMPAIGN_GROUP_FIELDS: ServiceFieldDef[] = [
  {
    key: "objective",
    label: "Campaign objective",
    type: "select",
    required: true,
    options: CAMPAIGN_OBJECTIVE_OPTIONS,
  },
  {
    key: "targetLocation",
    label: "Target location",
    type: "tags",
    required: false,
    placeholder: "e.g., Kochi, Kerala — press Enter to add",
  },
  {
    key: "audience",
    label: "Audience",
    type: "textarea",
    required: false,
    placeholder: "e.g., Women aged 25–40 interested in fitness",
  },
  {
    key: "productOrService",
    label: "Product / service to promote",
    type: "text",
    required: true,
    placeholder: "e.g., Your new spring collection",
  },
  {
    key: "targetCustomer",
    label: "Target customer",
    type: "textarea",
    required: false,
    placeholder: "e.g., First-time buyers, repeat customers",
  },
];

const ADVERTISING_FIELDS: ServiceFieldDef[] = [
  {
    key: "campaigns",
    label: "Campaigns",
    type: "groupList",
    required: true,
    groupFields: CAMPAIGN_GROUP_FIELDS,
    entryLabel: "Campaign",
  },
];

export const SERVICES: ServiceDef[] = [
  // Digital Marketing
  {
    id: "social_media_management",
    label: "Social Media Management",
    category: "digital_marketing",
    requiresBrandProfile: true,
    needsAssets: true,
    fields: [
      // Account details
      {
        key: "instagramUrl",
        label: "Instagram",
        type: "url",
        required: false,
        placeholder: "e.g., https://instagram.com/yourbrand",
      },
      {
        key: "facebookUrl",
        label: "Facebook",
        type: "url",
        required: false,
        placeholder: "e.g., https://facebook.com/yourbrand",
      },
      {
        key: "youtubeUrl",
        label: "YouTube",
        type: "url",
        required: false,
        placeholder: "e.g., https://youtube.com/@yourbrand",
      },
      {
        key: "linkedinUrl",
        label: "LinkedIn",
        type: "url",
        required: false,
        placeholder: "e.g., https://linkedin.com/company/yourbrand",
      },
      {
        key: "otherPlatforms",
        label: "Other platforms",
        type: "tags",
        required: false,
        placeholder: "e.g., Pinterest, Threads — press Enter to add",
      },
      // Content
      {
        key: "contentPreferences",
        label: "Content preferences",
        type: "textarea",
        required: false,
        placeholder: "Tell us what type of content you want to publish",
      },
      {
        key: "importantProducts",
        label: "Important products to feature",
        type: "textarea",
        required: false,
        placeholder: "e.g., Your bestsellers or seasonal items",
      },
      {
        key: "upcomingOffers",
        label: "Upcoming offers",
        type: "textarea",
        required: false,
        placeholder: "e.g., Onam sale, festive discount, new product launch",
      },
      {
        key: "events",
        label: "Events",
        type: "textarea",
        required: false,
        placeholder: "e.g., Store anniversary, product launch event",
      },
      {
        key: "importantDates",
        label: "Important dates",
        type: "textarea",
        required: false,
        placeholder: "e.g., festival dates, product launches, special events",
      },
    ],
  },
  {
    id: "social_media_advertising",
    label: "Social Media Advertising",
    category: "digital_marketing",
    fields: ADVERTISING_FIELDS,
  },
  {
    id: "google_ads",
    label: "Google Ads",
    category: "digital_marketing",
    fields: ADVERTISING_FIELDS,
  },
  {
    id: "whatsapp_marketing",
    label: "WhatsApp Marketing",
    category: "digital_marketing",
    fields: [
      { key: "businessNumberRegistered", label: "WhatsApp Business number already registered", type: "boolean", required: true },
      {
        key: "useCase",
        label: "Primary use case",
        type: "select",
        required: true,
        options: [
          { value: "promotions", label: "Promotions" },
          { value: "support", label: "Customer support" },
          { value: "both", label: "Both" },
        ],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    category: "digital_marketing",
    fields: [
      {
        key: "targetKeywords",
        label: "Target keywords",
        type: "textarea",
        required: false,
        placeholder: "e.g., best bakery in Kochi, online cake delivery",
      },
      {
        key: "competitorWebsites",
        label: "Competitor websites",
        type: "textarea",
        required: false,
        placeholder: "e.g., competitorsite.com — one per line",
      },
    ],
  },

  // Creative — reuse the shared brand profile + uploaded assets rather than
  // re-asking brand questions per creative service.
  {
    id: "daily_creative_designs",
    label: "Daily Creative Designs",
    category: "creative",
    requiresBrandProfile: true,
    needsAssets: true,
    fields: [
      {
        key: "designsPerWeek",
        label: "Designs needed per week",
        type: "number",
        required: false,
        placeholder: "e.g., 5",
      },
      {
        key: "preferredStyle",
        label: "Preferred style",
        type: "text",
        required: false,
        placeholder: "e.g., Minimal and modern, bold and colorful",
      },
    ],
  },
  {
    id: "video_advertisements",
    label: "Video Advertisements",
    category: "creative",
    requiresBrandProfile: true,
    needsAssets: true,
    fields: [
      {
        key: "videosPerMonth",
        label: "Videos needed per month",
        type: "number",
        required: false,
        placeholder: "e.g., 2",
      },
      { key: "scriptSupportNeeded", label: "Script support needed", type: "boolean", required: true },
      {
        key: "referenceLinks",
        label: "Reference links",
        type: "textarea",
        required: false,
        placeholder: "e.g., links to videos or ads you like",
      },
    ],
  },
  {
    id: "ai_videos",
    label: "AI Videos",
    category: "creative",
    requiresBrandProfile: true,
    needsAssets: true,
    fields: [
      {
        key: "useCase",
        label: "Use case",
        type: "text",
        required: false,
        placeholder: "e.g., Product demo, social media ad",
      },
      {
        key: "voiceoverLanguage",
        label: "Voiceover language",
        type: "text",
        required: false,
        placeholder: "e.g., English, Hindi, Malayalam",
      },
      {
        key: "referenceLinks",
        label: "Reference links",
        type: "textarea",
        required: false,
        placeholder: "e.g., links to videos or styles you like",
      },
    ],
  },
  {
    id: "reels_content_production",
    label: "Reels / Content Production",
    category: "creative",
    requiresBrandProfile: true,
    needsAssets: true,
    fields: [
      {
        key: "reelsPerMonth",
        label: "Reels needed per month",
        type: "number",
        required: false,
        placeholder: "e.g., 4",
      },
      { key: "shootLocationAvailable", label: "Shoot location available", type: "boolean", required: true },
      {
        key: "contentThemes",
        label: "Content themes",
        type: "textarea",
        required: false,
        placeholder: "e.g., Behind-the-scenes, product highlights",
      },
    ],
  },

  // Technology — requirements only, not the build/integration workflow itself.
  {
    id: "website_development",
    label: "Website Development",
    category: "technology",
    fields: [
      { key: "hasExistingWebsite", label: "Has an existing website", type: "boolean", required: true },
      {
        key: "existingWebsiteUrl",
        label: "Existing website URL",
        type: "url",
        required: true,
        dependsOn: { key: "hasExistingWebsite", equals: true },
        placeholder: "e.g., https://www.yourbusiness.com",
      },
      {
        key: "pagesRequired",
        label: "Pages required",
        type: "number",
        required: false,
        placeholder: "e.g., 5",
      },
      {
        key: "featuresRequired",
        label: "Features required",
        type: "textarea",
        required: false,
        placeholder: "e.g., Online booking, payment gateway, blog",
      },
    ],
  },
  {
    id: "crm_development",
    label: "CRM Development",
    category: "technology",
    fields: [
      {
        key: "currentProcess",
        label: "Current process",
        type: "textarea",
        required: false,
        placeholder: "e.g., We track leads in a spreadsheet today",
      },
      {
        key: "teamSize",
        label: "Team size",
        type: "number",
        required: false,
        placeholder: "e.g., 8",
      },
      {
        key: "integrationsRequired",
        label: "Integrations required",
        type: "textarea",
        required: false,
        placeholder: "e.g., WhatsApp, email, payment gateway",
      },
    ],
  },
  {
    id: "crm_integration",
    label: "CRM Integration",
    category: "technology",
    fields: [
      {
        key: "existingCrmName",
        label: "Existing CRM",
        type: "text",
        required: true,
        placeholder: "e.g., Zoho, HubSpot, Salesforce",
      },
      {
        key: "dataToMigrate",
        label: "Data to migrate",
        type: "textarea",
        required: false,
        placeholder: "e.g., Contacts, deal history, notes",
      },
      {
        key: "integrationTargets",
        label: "Systems to integrate with",
        type: "textarea",
        required: false,
        placeholder: "e.g., Your website, WhatsApp, email tool",
      },
    ],
  },

  // Customer Engagement — requirements only, not the operational service itself.
  {
    id: "call_centre_support",
    label: "Call Centre Support",
    category: "customer_engagement",
    fields: [
      {
        key: "expectedCallVolume",
        label: "Expected call volume (per month)",
        type: "number",
        required: false,
        placeholder: "e.g., 500",
      },
      {
        key: "languagesRequired",
        label: "Languages required",
        type: "multiselect",
        required: true,
        options: [
          { value: "english", label: "English" },
          { value: "hindi", label: "Hindi" },
          { value: "malayalam", label: "Malayalam" },
          { value: "other", label: "Other" },
        ],
      },
      {
        key: "operatingHours",
        label: "Operating hours",
        type: "text",
        required: false,
        placeholder: "e.g., 9 AM – 6 PM, Mon–Sat",
      },
    ],
  },
  {
    id: "lead_management",
    label: "Lead Management",
    category: "customer_engagement",
    fields: [
      {
        key: "currentLeadSource",
        label: "Current lead sources",
        type: "textarea",
        required: false,
        placeholder: "e.g., Website form, Instagram DMs, referrals",
      },
      {
        key: "monthlyLeadVolume",
        label: "Monthly lead volume",
        type: "number",
        required: false,
        placeholder: "e.g., 50",
      },
      {
        key: "crmInUse",
        label: "CRM currently in use",
        type: "text",
        required: false,
        placeholder: "e.g., None, or your current CRM name",
      },
    ],
  },
];

const SERVICE_BY_ID = new Map(SERVICES.map((s) => [s.id, s]));

export function getServiceById(id: string): ServiceDef | undefined {
  return SERVICE_BY_ID.get(id);
}

export function isValidServiceId(id: string): boolean {
  return SERVICE_BY_ID.has(id);
}

export function selectedServicesNeedBrandProfile(selectedServiceIds: string[]): boolean {
  return selectedServiceIds.some((id) => getServiceById(id)?.requiresBrandProfile);
}

export function selectedServicesNeedAssets(selectedServiceIds: string[]): boolean {
  return selectedServiceIds.some((id) => getServiceById(id)?.needsAssets);
}

// Which of the documented advertising channels are actually relevant —
// Meta Ads only if Social Media Advertising is selected, Google Ads only if
// Google Ads is selected. "Other" is appended once any channel applies, so
// a client with ad spend the two named channels don't cover has somewhere
// to put it, without treating budget as a general/forced field otherwise.
const ADVERTISING_CHANNEL_BY_SERVICE: Record<string, ServiceFieldOption> = {
  social_media_advertising: { value: "meta_ads", label: "Meta Ads" },
  google_ads: { value: "google_ads", label: "Google Ads" },
};

export function getApplicableBudgetChannels(selectedServiceIds: string[]): ServiceFieldOption[] {
  const channels = selectedServiceIds
    .map((id) => ADVERTISING_CHANNEL_BY_SERVICE[id])
    .filter((c): c is ServiceFieldOption => Boolean(c));

  if (channels.length === 0) return [];
  return [...channels, { value: "other", label: "Other" }];
}

export function selectedServicesNeedBudget(selectedServiceIds: string[]): boolean {
  return getApplicableBudgetChannels(selectedServiceIds).length > 0;
}
