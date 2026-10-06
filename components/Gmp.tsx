import type { Ipo } from "@/lib/types";
import { deriveIpo } from "@/lib/gmp";
import { pct, rupee, signedRupee } from "@/lib/format";
import { CountUp } from "@/components/CountUp";

export type Tone = "gain" | "loss" | "flat" | "none";
export const toneOf = (v: number | null): Tone => (v === null ? "none" : v > 0 ? "gain" : v < 0 ? "loss" : "flat");

export const TONE_TEXT: Record<Tone, string> = { gain: "text-gain", loss: "text-loss", flat: "text-fg", none: "text-faint" };
export const TONE_PILL: Record<Tone, string> = {
  gain: "bg-gain-soft text-gain", loss: "bg-loss-soft text-loss", flat: "bg-line text-muted", none: "bg-line text-faint",
};

/** Unknown is words, never ₹0. A genuine zero reading is shown as ₹0. */
export const gmpText = (v: number) => (v === 0 ? "₹0" : signedRupee(v)!);
export const missingGmp = (status: Ipo["status"]) => (status === "upcoming" || status === "open" ? "Not reported yet" : "Not available");

export function PctPill({ value, className = "", count = false }: { value: number | null; className?: string; count?: boolean }) {
  if (value === null) return null;
  const t = toneOf(value);
  return (
    <span className={`num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${TONE_PILL[t]} ${className}`}>
      {t === "gain" && <span aria-hidden>▲</span>}
      {t === "loss" && <span aria-hidden>▼</span>}
      {count ? <CountUp value={value} format="pct" /> : pct(value)}
    </span>
  );
}

/** Compact GMP readout used in cards: label, prominent value, subordinate %, expected price. */
export function GmpBlock({ ipo, large = false }: { ipo: Ipo; large?: boolean }) {
  const v = ipo.gmp?.value ?? null;
  const t = toneOf(v);
  const d = deriveIpo(ipo);
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="t-caption">{ipo.status === "closed" || ipo.status === "listed" ? "Last GMP" : "GMP"}</div>
        {v === null ? (
          <div className="mt-1.5 text-sm text-faint">{missingGmp(ipo.status)}</div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`t-metric ${large ? "text-5xl" : "text-[2.25rem]"} ${TONE_TEXT[t]}`}><CountUp value={v} format="gmp" /></span>
            <PctPill value={d.estGainPct} count />
            {d.pctMismatch && (
              <abbr title="The data provider's own GMP percentage disagrees with this figure" className="text-xs text-faint no-underline">*</abbr>
            )}
          </div>
        )}
      </div>
      {d.estListingPrice !== null && (
        <div className="shrink-0 text-right">
          <div className="t-caption">Est. listing</div>
          <div className="num mt-1.5 text-lg font-semibold">{rupee(d.estListingPrice)}</div>
        </div>
      )}
    </div>
  );
}
