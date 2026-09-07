import { site } from "@/shared/config/site";
import Marquee from "@/components/motion/Marquee";

export default function ServiceStrip() {
  return (
    <div
      data-anim="service-strip"
      className="font-body text-xs tracking-[0.14em] text-ash opacity-0"
    >
      <Marquee>
        {site.services.map((service, i) => (
          <span key={service} className="flex items-center">
            {service}
            {i < site.services.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-3 inline-block h-3 w-px align-middle bg-carbon"
              />
            )}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
