import { site } from "@/shared/config/site";

export default function Statement() {
  return (
    <p
      data-anim="statement"
      className="mt-6 max-w-[60ch] font-body text-xl leading-snug text-bone opacity-0 md:mt-8 md:leading-normal"
    >
      {site.tagline}
    </p>
  );
}
