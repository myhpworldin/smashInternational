// Single source of truth for brand content. Runs on both server and client — no Node/browser APIs.
//
// PLACEHOLDER FIELDS — replace before launch:
//   email

export const site = {
  name: "Smash International",
  shortName: "Smash",
  domain: "smash.international",
  // Registered legal entity — distinct from the "Smash International" brand.
  legalName: "Smash Digital Media Private Limited",
  // The part of legalName that renders under the SMASH wordmark.
  legalNameSuffix: "DIGITAL MEDIA PRIVATE LIMITED",
  parent: "Sysmantech",
  tagline:
    "We're building search, paid media, social, content, and analytics campaigns. Launching soon.",
  email: "hello@smash.international",
  phone: "+91 95399 00003",
  phoneHref: "+919539900003",
  address: {
    line1: "Ground Floor, Arthungal Residency",
    street: "Cheruparambath Rd",
    locality: "Kadavanthra",
    city: "Kochi",
    district: "Ernakulam",
    region: "Kerala",
    postalCode: "682020",
    country: "IN",
  },
  services: ["Search", "Paid media", "Social", "Content", "Analytics"],
} as const;

export type Site = typeof site;
