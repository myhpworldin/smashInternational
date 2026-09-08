import ContactRail from "@/components/layout/ContactRail";
import ServiceStrip from "@/components/layout/ServiceStrip";
import TopRail from "@/components/layout/TopRail";
import Seam from "@/components/hero/Seam";
import Statement from "@/components/hero/Statement";
import Wordmark from "@/components/hero/Wordmark";
import NotifyForm from "@/components/form/NotifyForm";
import HeroTimeline from "@/components/motion/HeroTimeline";
import Grain from "@/components/ambient/Grain";
import { site } from "@/shared/config/site";

export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <Grain />
      <HeroTimeline>
        <main className="relative flex min-h-dvh flex-col px-6 py-4 md:px-10 md:py-8">
          <Seam />
          <TopRail />
          <div className="relative z-10 flex flex-1 flex-col items-start justify-end pb-[6vh] sm:pb-[10vh]">
            <Wordmark />
            <p
              data-anim="intl"
              className="translate-y-2 font-body text-base text-ash opacity-0"
            >
              {site.legalNameSuffix}
            </p>
            <Statement />
            <NotifyForm />
          </div>
          <div className="relative z-10 flex flex-col gap-3 md:gap-4">
            <ServiceStrip />
            <ContactRail />
          </div>
        </main>
      </HeroTimeline>
    </>
  );
}
