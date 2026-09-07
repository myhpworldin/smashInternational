import { site } from "@/shared/config/site";

const letters = ["S", "M", "A", "S", "H"] as const;

export default function Wordmark() {
  return (
    <h1
      className={`-ml-[0.06em] text-[clamp(3.2rem,19vw,7rem)] md:text-[clamp(4rem,16vw,15rem)] font-display leading-[0.82] tracking-[-0.02em] text-white [font-variation-settings:"wght"_900,"wdth"_62]`}
    >
      <span className="sr-only">{site.name}</span>
      <span aria-hidden="true">
        {letters.map((letter, i) => (
          <span
            key={i}
            data-letter={letter}
            className="inline-block translate-y-10 opacity-0 [will-change:transform,opacity]"
          >
            {letter}
          </span>
        ))}
      </span>
    </h1>
  );
}
