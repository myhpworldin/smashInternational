import { site } from "@/shared/config/site";

export default function TopRail() {
  return (
    <header
      data-anim="top-rail"
      className="relative z-10 flex translate-y-2 flex-col items-start gap-2 font-body text-xs tracking-[0.14em] text-bone opacity-0 md:flex-row md:items-center md:justify-between md:gap-0"
    >
      <span>{site.name}</span>
      <span className="flex items-center gap-2 text-ash">
        <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-smash" />
        Launching soon
      </span>
    </header>
  );
}
