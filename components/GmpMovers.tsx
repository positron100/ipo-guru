import type { Ipo } from "@/lib/types";
import { deriveIpo } from "@/lib/gmp";
import { dayMonth, rupee, signedRupee } from "@/lib/format";
import { GlassCard } from "@/components/glass/GlassStatic";
import { GlowCard } from "@/components/glass/Glass";
import { PctPill, TONE_TEXT, gmpText, toneOf } from "@/components/Gmp";
import type { Tone } from "@/components/Gmp";
import { StatusBadge } from "@/components/ui";
import { WarmLink } from "@/components/nav/Prefetch";
import { Fresh } from "@/components/Fresh";
import { Icon } from "@/components/Icon";

const css = (o: Record<string, string | number>) => o as React.CSSProperties;
const ARROW = { gain: "up", loss: "down", flat: "flat", none: "flat" } as const;
const WORD = { gain: "Premium", loss: "Discount", flat: "Flat", none: "No GMP" } as const;
const TREND = { gain: "trend-up", loss: "trend-down", flat: "", none: "" } as const;

/**
 * Direction cue. Describes where the GMP sits against the issue price (premium / discount / flat); it does not claim
 * movement over time, because the list data carries no history. The arrow settles once on entry and again on hover.
 */
export function Direction({ tone, className = "" }: { tone: Tone; className?: string }) {
  return (
    <span className={`${TREND[tone]} t-small inline-flex items-center gap-1 font-medium ${tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-muted"} ${className}`}>
      <Icon name={ARROW[tone]} size={14} />
      {WORD[tone]}
    </span>
  );
}

/** Horizontal meter: fill is this IPO's |gain| relative to the biggest gain on the page. */
function Bar({ value, max, tone, index = 0 }: { value: number; max: number; tone: Tone; index?: number }) {
  const w = max > 0 ? Math.max(4, (Math.abs(value) / max) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
      <div className={`bar-grow h-full rounded-full ${tone === "loss" ? "bg-loss" : "bg-gain"}`} style={css({ width: `${w}%`, "--i": index })} />
    </div>
  );
}

/** The #1 mover, full width. GMP value dominates; everything else is subordinate. */
export function FeaturedMover({ ipo, rank, of }: { ipo: Ipo; rank: number; of: number }) {
  const d = deriveIpo(ipo);
  const v = ipo.gmp!.value;
  const t = toneOf(v);
  return (
    <GlowCard as={WarmLink} warm href={`/ipo/${ipo.slug}`} tilt={false} className="enter group grid cursor-pointer gap-10 p-8 sm:p-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:p-14" style={css({ "--i": 2 })}>
      <div className="flex flex-col justify-between gap-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="t-caption flex items-center gap-2"><Icon name="bolt" size={14} className="jiggle" />Top GMP mover · {rank} of {of}</span>
          <StatusBadge status={ipo.status} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            <span className="transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent">{ipo.name}</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-3">
            <span className={`t-metric text-[clamp(4rem,10vw,8.5rem)] ${TONE_TEXT[t]}`}>{gmpText(v)}</span>
            <div className="pb-3 sm:pb-5">
              <PctPill value={d.estGainPct} className="!px-3.5 !py-1.5 !text-lg" />
              <div className="t-small mt-2 text-faint">Expected listing gain</div>
            </div>
          </div>
        </div>
        <span className="t-small inline-flex items-center gap-1.5 font-medium text-accent">
          View IPO <Icon name="arrow" size={15} className="ico-right" />
        </span>
      </div>

      <div className="grid content-center gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Stat label="Expected listing" value={rupee(d.estListingPrice)} strong />
        {d.gainPerLot !== null && <Stat label="GMP per lot" value={signedRupee(d.gainPerLot)} tone={toneOf(d.gainPerLot)} />}
        <Stat label="Upper band" value={rupee(ipo.priceBand.max)} />
        <Stat label="Closes" value={dayMonth(ipo.dates.close)} />
        <div className="flex items-center justify-between gap-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <Direction tone={t} />
          {ipo.gmp?.updatedAt && <Fresh iso={ipo.gmp.updatedAt} label="GMP" />}
        </div>
      </div>
    </GlowCard>
  );
}

const Stat = ({ label, value, tone = "none", strong = false }: { label: string; value: string | null; tone?: Tone; strong?: boolean }) => (
  <div className="rounded-2xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong hover:bg-[var(--surface-hover)]">
    <div className="t-caption">{label}</div>
    <div className={`t-metric mt-3 ${strong ? "text-3xl" : "text-2xl"} ${tone === "none" ? "" : TONE_TEXT[tone]}`}>
      {value ?? <span className="text-base font-normal text-faint">Not available</span>}
    </div>
  </div>
);

/** Ranked mover card: GMP is the hero number, gain % supports it, the bar compares it with the page leader. */
export function MoverCard({ ipo, rank, maxGain, index }: { ipo: Ipo; rank: number; maxGain: number; index: number }) {
  const d = deriveIpo(ipo);
  const v = ipo.gmp!.value;
  const t = toneOf(v);
  return (
    <GlowCard as={WarmLink} warm href={`/ipo/${ipo.slug}`} className={`${index < 4 ? "enter" : "reveal"} group flex cursor-pointer flex-col gap-6 p-7 lg:p-8`} style={css({ "--i": 3 + index })}>
      <div className="kid flex items-start justify-between gap-3" style={css({ "--i": index, "--c": 0 })}>
        <div className="min-w-0">
          <div className="t-caption num">#{String(rank).padStart(2, "0")}</div>
          <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
            <span className="line-clamp-2 transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent">{ipo.name}</span>
          </h3>
        </div>
        <StatusBadge status={ipo.status} />
      </div>

      <div className="kid" style={css({ "--i": index, "--c": 1 })}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`t-metric text-5xl transition-transform duration-300 group-hover:scale-[1.04] ${TONE_TEXT[t]}`} style={{ transformOrigin: "left" }}>{gmpText(v)}</span>
          <PctPill value={d.estGainPct} />
        </div>
        {d.estGainPct !== null && <div className="mt-5"><Bar value={d.estGainPct} max={maxGain} tone={t} index={index} /></div>}
      </div>

      <div className="kid mt-auto flex items-end justify-between gap-4 border-t border-line pt-5" style={css({ "--i": index, "--c": 2 })}>
        <div>
          <div className="t-caption">Est. listing</div>
          <div className="num mt-1.5 text-xl font-semibold">{rupee(d.estListingPrice) ?? "–"}</div>
        </div>
        <div className="text-right">
          <div className="t-caption">Band</div>
          <div className="num mt-1.5 text-base text-muted">{rupee(ipo.priceBand.max) ?? "–"}</div>
        </div>
        <Direction tone={t} />
      </div>
    </GlowCard>
  );
}

/** Market-level summary tile. */
export const SummaryTile = ({ label, value, sub, index }: { label: string; value: React.ReactNode; sub: React.ReactNode; index: number }) => (
  <GlassCard className="enter p-6 lg:p-8" style={css({ "--i": index })}>
    <p className="t-caption">{label}</p>
    <p className="t-metric mt-4 text-3xl sm:text-4xl lg:text-5xl">{value}</p>
    <p className="t-small mt-3 text-faint">{sub}</p>
  </GlassCard>
);
