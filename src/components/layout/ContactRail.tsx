import { site } from "@/shared/config/site";

export default function ContactRail() {
  const { address } = site;

  return (
    <footer
      data-anim="contact-rail"
      className="relative z-10 flex flex-col gap-2 border-t border-carbon pt-3 font-body text-xs text-ash opacity-0 md:flex-row md:items-end md:justify-between md:gap-6 md:pt-4"
    >
      <div className="flex flex-col gap-1 whitespace-nowrap md:shrink-0 md:flex-row md:items-center md:gap-4">
        <a
          href={`mailto:${site.email}`}
          className="transition-colors duration-150 hover:text-smash-text"
        >
          {site.email}
        </a>
        <a
          href={`tel:${site.phoneHref}`}
          className="transition-colors duration-150 hover:text-smash-text"
        >
          {site.phone}
        </a>
      </div>
      <address className="not-italic md:min-w-0 md:flex-1 md:text-center">
        {address.line1}, {address.street}, {address.locality}, {address.city},{" "}
        {address.district}, {address.region} {address.postalCode},{" "}
        {address.country}
      </address>
      <p
        data-anim="sysmantech"
        className="whitespace-nowrap text-[11px] text-ash opacity-0 md:shrink-0 md:text-right"
      >
        A {site.parent} company
      </p>
    </footer>
  );
}
