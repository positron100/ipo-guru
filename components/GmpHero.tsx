import type { Ipo } from "@/lib/types";
import { deriveIpo } from "@/lib/gmp";
import { pct, rupee, signedRupee } from "@/lib/format";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { CountUp } from "@/components/CountUp";
import { Fresh } from "@/components/Fresh";
import { PctPill, TONE_TEXT, toneOf } from "@/components/Gmp";
import { Icon } from "@/components/Icon";

const GLOW = {
  gain: "from-gain/14", loss: "from-loss/14", flat: "from-accent/10", none: "from-accent/8",
} as const;

/** Sentiment meter: centre = issue price; bar extends right (premium) or left (discount), capped at ±25%. */
function Meter({ value }: { value: number }) {
  const w = Math.min(Math.abs(value), 25) / 25 * 50;
  const t = toneOf(value);
  return (
    <div className="mt-8" role="img" aria-label={`Estimated ${pct(value)} versus the upper price band`}>
      <div className="relative h-1.5 rounded-full bg-line">
        <div className="absolute inset-y-[-3px] left-1/2 w-px bg-line-strong" />
        <div
          className={`bar-grow absolute inset-y-0 rounded-full ${t === "loss" ? "bg-loss" : "bg-gain"}`}
          style={{ width: `${w}%`, [value < 0 ? "right" : "left"]: "50%", transformOrigin: value < 0 ? "right" : "left" }}
        />
      </div>
      <div className="t-caption mt-2 flex justify-between normal-case tracking-normal"><span>Discount</span><span>Issue price</span><span>Premium</span></div>
    </div>
  );
}

export function GmpHero({ ipo }: { ipo: Ipo }) {
  const v = ipo.gmp?.value ?? null;
  const d = deriveIpo(ipo);
  const t = toneOf(v);
  const stale = ipo.status === "closed" || ipo.status === "listed";
  const updated = ipo.gmp?.updatedAt ?? null;
  // Movement is only claimed when the provider supplied history: newest reading first.
  const delta = ipo.history && ipo.history.length >= 2 ? ipo.history[0].gmp - ipo.history[1].gmp : null;
  const move = delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <GlassPanel className={`enter overflow-hidden bg-gradient-to-br ${GLOW[t]} to-transparent p-7 sm:p-10 lg:p-14`} style={{ "--i": 2 } as React.CSSProperties}>
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="t-caption flex items-center gap-2"><Icon name="bolt" size={13} />Grey-market premium · unofficial</div>
        {updated && (
          <Fresh iso={updated} label="GMP updated" className="!text-faint" />
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end lg:gap-16">
        <div>
          <div className="t-small text-muted">{stale ? "Last reported GMP" : "Current GMP"}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={`t-metric text-[clamp(3.5rem,10vw,7.5rem)] ${v === null ? "!text-2xl !font-normal text-faint" : TONE_TEXT[t]}`}>
              {v === null ? "Not reported" : <CountUp value={v} format="gmp" />}
            </span>
            {v !== null && <PctPill value={d.estGainPct} count className="!px-3 !py-1 !text-sm" />}
            {move && delta !== null && (
              <span className={`${move === "up" ? "trend-up text-gain" : move === "down" ? "trend-down text-loss" : "text-muted"} t-small inline-flex items-center gap-1.5 font-medium`}>
                <Icon name={move} size={15} />
                {move === "up" ? "Rising" : move === "down" ? "Falling" : "Unchanged"}
                {delta !== 0 && <span className="num text-faint">{signedRupee(delta)} vs previous reading</span>}
              </span>
            )}
          </div>
          {v !== null && d.estGainPct !== null && <Meter value={d.estGainPct} />}
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Cell label="Expected listing" value={rupee(d.estListingPrice)} strong />
          <Cell label="Listing gain" value={pct(d.estGainPct)} tone={toneOf(d.estGainPct)} />
          <Cell label="GMP per lot" value={signedRupee(d.gainPerLot)} tone={toneOf(d.gainPerLot)} />
          <Cell label="Upper band" value={rupee(ipo.priceBand.max)} />
        </dl>
      </div>

      <ul className="t-small mt-6 space-y-1 border-t border-line pt-4 text-faint">
        {d.pctMismatch && (
          <li>The data provider&apos;s own GMP percentage ({pct(ipo.gmp!.providerPct)}) differs from the figure calculated here; treat both with caution.</li>
        )}
        <li>Estimated price = upper band + GMP; estimated gain % = GMP ÷ upper band × 100. These are not forecasts of the actual listing price.</li>
      </ul>
    </GlassPanel>
  );
}

function Cell({ label, value, tone = "none", strong = false }: { label: string; value: string | null; tone?: ReturnType<typeof toneOf>; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong hover:bg-[var(--surface-hover)]">
      <dt className="t-caption">{label}</dt>
      <dd className={`t-metric mt-2 ${strong ? "text-3xl" : "text-2xl"} ${value === null ? "!text-sm !font-normal text-faint" : tone === "none" ? "" : TONE_TEXT[tone]}`}>
        {value ?? "Not available"}
      </dd>
    </div>
  );
}
