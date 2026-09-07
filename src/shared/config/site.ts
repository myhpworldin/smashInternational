// Single source of truth for brand content. Runs on both server and client — no Node/browser APIs.
//
// PLACEHOLDER FIELDS — replace before launch:
//   email, phone, phoneHref

export const site = {
  name: "Smash International",
  shortName: "Smash",
  domain: "smash.international",
  parent: "Sysmantech",
  tagline: "We're building Sysmantech's digital marketing arm. Launching soon.",
  email: "hello@smash.international",
  phone: "+91 00000 00000",
  phoneHref: "+910000000000",
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
