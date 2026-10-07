import { WarmLink } from "@/components/nav/Prefetch";
import type { Ipo } from "@/lib/types";
import { deriveIpo } from "@/lib/gmp";
import { dayMonth, rupee } from "@/lib/format";
import { GlowCard } from "@/components/glass/Glass";
import { PctPill, TONE_TEXT, gmpText, missingGmp, toneOf } from "@/components/Gmp";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ClosingClock, CtaArrow } from "@/components/Breathing";

/** Hero-side featured IPO: the open IPO with the highest derivable GMP %, as one large link. */
export function Spotlight({ ipo }: { ipo: Ipo }) {
  const d = deriveIpo(ipo);
  const v = ipo.gmp?.value ?? null;
  const t = toneOf(v);
  return (
    <GlowCard as={WarmLink} warm href={`/ipo/${ipo.slug}`} tilt={false} className="enter breathe-card group flex h-full cursor-pointer flex-col justify-between gap-6 p-5 sm:min-h-[22rem] sm:gap-8 sm:p-8 lg:p-10" style={{ "--i": 3 } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-4">
        <div className="t-caption flex items-center gap-2"><Icon name="bolt" size={14} className="jiggle" />Spotlight · open now</div>
        <StatusBadge status={ipo.status} />
      </div>

      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
          <span className="transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent">{ipo.name}</span>
        </h2>
        <div className="mt-6">
          <div className="t-caption">Current GMP</div>
          {v === null ? (
            <div className="mt-2 text-lg text-faint">{missingGmp(ipo.status)}</div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className={`t-metric text-[clamp(3rem,7vw,5.5rem)] ${TONE_TEXT[t]}`}>{gmpText(v)}</span>
              <PctPill value={d.estGainPct} className="!px-3 !py-1.5 !text-base" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-5 sm:gap-4 sm:pt-6">
        <Fact label="Upper band" value={rupee(ipo.priceBand.max)} />
        <Fact label="Est. listing" value={rupee(d.estListingPrice)} />
        <Fact label="Closes" value={dayMonth(ipo.dates.close)} extra={<ClosingClock close={ipo.dates.close} />} />
      </div>
      <span className="t-small inline-flex items-center gap-1.5 font-medium text-accent">
        View IPO <CtaArrow />
      </span>
    </GlowCard>
  );
}

const Fact = ({ label, value, extra }: { label: string; value: string | null; extra?: React.ReactNode }) => (
  <div>
    <div className="t-caption flex items-center gap-1.5">{label}{extra}</div>
    <div className="num mt-1.5 text-base font-semibold sm:text-lg">{value ?? <span className="font-normal text-faint">–</span>}</div>
  </div>
);
