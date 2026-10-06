"use client";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Row } from "@/lib/rows";
import type { IpoStatus } from "@/lib/types";
import { crore, dateOnly, dayMonth, rupee, shortIST } from "@/lib/format";
import { GlowCard } from "@/components/glass/Glass";
import { PctPill, TONE_TEXT, gmpText, missingGmp, toneOf } from "@/components/Gmp";
import type { Tone } from "@/components/Gmp";
import { StatusBadge } from "@/components/ui";
import { WarmLink } from "@/components/nav/Prefetch";
import { Icon } from "@/components/Icon";
import { duration, ease, spring } from "@/components/motion/tokens";

const LEAD = { gain: "up", loss: "down", flat: "flat", none: "flat" } as const;
const LEAD_BG: Record<Tone, string> = { gain: "bg-gain-soft text-gain", loss: "bg-loss-soft text-loss", flat: "bg-line text-muted", none: "bg-line text-faint" };
const TREND: Record<Tone, string> = { gain: "trend-up", loss: "trend-down", flat: "", none: "" };

/** Shared column template (desktop). The group header and rows must agree, so it lives here. */
export const ROW_COLS = "lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]";

const Label = ({ children }: { children: React.ReactNode }) => <div className="t-caption">{children}</div>;

/**
 * One IPO. Whole row is a link (stretched on the name); the chevron expands a details panel and sits above the link.
 * Priority: identity, GMP (dominant), gain %, expected listing, status. Band and dates are supporting; the rest is in the panel.
 * On small screens only identity, GMP, gain % and status show; everything else moves into the panel.
 */
export function BoardRow({ r }: { r: Row }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const t = toneOf(r.gmp);
  const status = r.status as IpoStatus;
  const board = r.board === "SME" ? "SME" : r.board === "MAINBOARD" ? "Mainboard" : null;
  const stale = status === "closed" || status === "listed";

  return (
    <GlowCard tilt={false} className="group [backdrop-filter:none] [-webkit-backdrop-filter:none] bg-[var(--surface-strong)]">
      <WarmLink warm href={`/ipo/${r.slug}`} className={`relative flex cursor-pointer flex-col gap-4 px-5 py-5 lg:grid lg:items-center lg:gap-6 lg:px-7 lg:py-6 ${ROW_COLS}`}>
        {/* identity */}
        <div className="flex min-w-0 items-center gap-4">
          <span className={`${TREND[t]} grid size-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${LEAD_BG[t]}`}>
            <Icon name={LEAD[t]} size={18} />
          </span>
          <div className="min-w-0">
            <h4 className="text-lg font-semibold leading-snug tracking-tight">
              <span className="block truncate transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent">{r.name}</span>
            </h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {board && <span className="t-caption">{board}</span>}
              <span className="lg:hidden"><StatusBadge status={status} /></span>
              <span className="num t-small hidden text-faint lg:inline">{rupee(r.priceMax) ? `${rupee(r.priceMax)} upper band` : "Band not announced"}</span>
            </div>
          </div>
        </div>

        {/* GMP + gain: stay together on small screens, separate grid columns on desktop */}
        <div className="flex items-end justify-between gap-4 lg:contents">
          <div>
            <Label>{stale ? "Last GMP" : "GMP"}</Label>
            {r.gmp === null ? (
              <div className="mt-1.5 flex min-h-[2.6rem] items-center text-sm text-faint">{missingGmp(status)}</div>
            ) : (
              <div className={`t-metric mt-1.5 origin-left text-4xl transition-transform duration-300 group-hover:scale-[1.05] lg:text-[2.6rem] ${TONE_TEXT[t]}`}>{gmpText(r.gmp)}</div>
            )}
          </div>
          <div className="text-right lg:text-left">
            <Label>Expected gain</Label>
            <div className="mt-1.5 flex min-h-[2.6rem] items-center lg:justify-start">
              {r.gmpPct !== null ? <PctPill value={r.gmpPct} className="!px-3 !py-1.5 !text-sm" /> : <span className="text-sm text-faint">–</span>}
              {r.mismatch && <abbr title="The data provider's own GMP percentage disagrees with this figure" className="ml-1 text-faint no-underline">*</abbr>}
            </div>
          </div>
        </div>

        {/* expected listing (desktop) */}
        <div className="hidden lg:block">
          <Label>Expected listing</Label>
          <div className="num mt-1.5 flex min-h-[2.6rem] items-center text-xl font-semibold">{rupee(r.estPrice) ?? <span className="text-base font-normal text-faint">–</span>}</div>
        </div>

        {/* supporting dates + status (desktop) */}
        <div className="hidden space-y-1.5 lg:block">
          <StatusBadge status={status} short />
          <div className="num t-small text-muted">
            {r.close ? <>Closes {dayMonth(r.close)}</> : "Close date TBA"}
            {r.listing && <> · Lists {dayMonth(r.listing)}</>}
          </div>
        </div>

        {/* actions: the chevron is the one control inside the row-link that must not navigate */}
        <div className="absolute right-3 top-3 flex items-center gap-1 lg:static">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panel}
            aria-label={`${open ? "Hide" : "Show"} details for ${r.name}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
            className="hit relative z-10 grid size-9 place-items-center rounded-full text-faint transition-[color,background-color,transform] duration-200 hover:bg-line hover:text-fg active:scale-90"
          >
            <svg viewBox="0 0 10 6" width="11" height="7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
          <span className="hidden size-9 place-items-center rounded-full bg-accent-soft text-accent opacity-60 transition-opacity duration-300 group-hover:opacity-100 lg:grid" aria-hidden>
            <Icon name="arrow" size={16} className="ico-right" />
          </span>
        </div>
      </WarmLink>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panel}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: spring.snappy, opacity: { duration: duration.interactive, delay: 0.05 } } }}
            exit={{ height: 0, opacity: 0, transition: { duration: duration.interactive, ease: ease.exit } }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line px-5 py-5 sm:grid-cols-3 lg:grid-cols-4 lg:px-7 lg:py-6">
              <Fact label="Price band" value={r.priceMax !== null ? (r.priceMin !== null && r.priceMin !== r.priceMax ? `${rupee(r.priceMin)} – ${rupee(r.priceMax)}` : rupee(r.priceMax)) : null} />
              <Fact label="Lot size" value={r.lotSize !== null ? `${r.lotSize} shares` : null} />
              <Fact label="Min. investment" value={rupee(r.minInvestment)} />
              <Fact label="Issue size" value={crore(r.issueSizeCr)} />
              <Fact label="Expected listing" value={rupee(r.estPrice)} className="lg:hidden" />
              <Fact label="Opens" value={dateOnly(r.open)} />
              <Fact label="Closes" value={dateOnly(r.close)} />
              <Fact label="Listing" value={dateOnly(r.listing)} />
              <Fact label="GMP updated" value={r.gmpUpdatedAt ? shortIST(r.gmpUpdatedAt) : null} />
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </GlowCard>
  );
}

/** Only facts we actually have are listed; the list feed has no lot or issue size for most IPOs (the detail page does). */
const Fact = ({ label, value, className = "" }: { label: string; value: string | null; className?: string }) =>
  value === null ? null : (
    <div className={className}>
      <dt className="t-caption">{label}</dt>
      <dd className="num mt-1.5 font-medium">{value}</dd>
    </div>
  );
