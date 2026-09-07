import type { Metadata } from "next";
import { Archivo, Inter_Tight } from "next/font/google";
import "./globals.css";
import { site } from "@/shared/config/site";

const archivo = Archivo({
  axes: ["wdth"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  adjustFontFallback: true,
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-inter-tight",
  adjustFontFallback: true,
});

const siteUrl = `https://${site.domain}`;
const title = `${site.name} — Launching soon`;
const description =
  "Smash International builds search, paid media, social, content, and analytics campaigns — Sysmantech's digital marketing arm, launching soon.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: site.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: siteUrl,
  logo: `${siteUrl}/apple-icon`,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.line1}, ${site.address.street}, ${site.address.locality}`,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  parentOrganization: {
    "@type": "Organization",
    name: site.parent,
  },
  // TODO: add telephone and email once the site.ts placeholders are replaced with real values
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${interTight.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
