"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pills } from "@/components/Pills";
import { ExpandPill } from "@/components/ExpandPill";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import type { Row } from "@/lib/rows";
import type { IpoStatus } from "@/lib/types";
import { dayMonth } from "@/lib/format";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { BoardRow } from "@/components/BoardRow";
import { Select } from "@/components/Select";
import { Icon } from "@/components/Icon";
import { LiveCount } from "@/components/LiveCount";
import { ClosingClock } from "@/components/Breathing";
import { TONE_TEXT, gmpText, toneOf } from "@/components/Gmp";
import { duration, ease, spring } from "@/components/motion/tokens";

type Life = "all" | IpoStatus;
type Kind = "all" | "MAINBOARD" | "SME";
type SortKey = "default" | "gmp" | "gmpPct" | "close" | "listing";

const GROUPS: { key: IpoStatus; title: string; note: string; dot: string }[] = [
  { key: "open", title: "Live / open", note: "Open for bids now. Closing soonest first.", dot: "bg-gain" },
  { key: "upcoming", title: "Upcoming", note: "Announced, not yet open. Opening soonest first.", dot: "bg-info" },
  { key: "closed", title: "Awaiting listing", note: "Bidding closed, listing pending. Latest first.", dot: "bg-warn" },
  { key: "listed", title: "Listed", note: "Already trading. Latest first.", dot: "bg-faint" },
];
const SORTS: { value: SortKey; label: string; dir: 1 | -1 }[] = [
  { value: "default", label: "Life-cycle order", dir: 1 },
  { value: "gmp", label: "GMP", dir: -1 },
  { value: "gmpPct", label: "GMP %", dir: -1 },
  { value: "close", label: "Closing date", dir: 1 },
  { value: "listing", label: "Listing date", dir: 1 },
];
const FIRST = 8;                // rows mounted per group at first; a long tail (204 closed IPOs) is revealed in steps so a filter change never mounts hundreds of rows at once
const MORE = 24;                // rows added per "show more"
const LAYOUT_ANIM_MAX = 40;     // glide rows only while the visible list is small enough to stay smooth
const SETTLE_MS = 700;          // idle (breathing) motion on the list pauses this long after a filter / sort change

const ts = (v: string | null) => (v ? Date.parse(v) : null);

/** Natural order inside each group, used when no explicit sort is chosen. */
const NATURAL: Record<IpoStatus, (r: Row) => number | null> = {
  open: (r) => ts(r.close),                                   // asc: closing soonest
  upcoming: (r) => ts(r.open) ?? ts(r.close),                 // asc: opening soonest
  closed: (r) => { const v = ts(r.listing) ?? ts(r.close); return v === null ? null : -v; },   // desc
  listed: (r) => { const v = ts(r.listing) ?? ts(r.close); return v === null ? null : -v; },   // desc
};
const VALUE: Record<Exclude<SortKey, "default">, (r: Row) => number | null> = {
  gmp: (r) => r.gmp, gmpPct: (r) => r.gmpPct, close: (r) => ts(r.close), listing: (r) => ts(r.listing),
};

/** Unknown values always sort last, whichever the direction. */
function sortRows(rows: Row[], key: SortKey, dir: 1 | -1, status: IpoStatus): Row[] {
  const get = key === "default" ? NATURAL[status] : VALUE[key];
  const d = key === "default" ? 1 : dir;
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * d;
  });
}

const DirButton = ({ sort, dir, onClick }: { sort: SortKey; dir: 1 | -1; onClick: () => void }) => (
  <button
    type="button"
    disabled={sort === "default"}
    aria-label={dir === 1 ? "Ascending, switch to descending" : "Descending, switch to ascending"}
    onClick={onClick}
    className="btn btn-ghost !size-[42px] !p-0 sm:!size-11 disabled:pointer-events-none disabled:opacity-40"
  >
    <Icon name="down" size={16} className={`transition-transform duration-300 ${dir === 1 ? "rotate-180" : ""}`} />
  </button>
);

const Dot = ({ cls }: { cls: string }) => <span className={`inline-block size-2 rounded-full ${cls}`} aria-hidden />;

/**
 * IPO market board: everything we track, grouped by life-cycle stage. Summary strip, filters, sort, then rows (see BoardRow).
 * Pure presentation over the same rows the old table used; nothing here fetches or computes GMP.
 */
export function MarketBoard({ rows }: { rows: Row[] }) {
  const [life, setLife] = useState<Life>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [dir, setDir] = useState<1 | -1>(1);
  // Filter swap choreography: the list container holds the old height while rows leave and arrive, then eases to the new height
  // measured right after the swap commits. Other size changes (a row expanding, a sort) must follow instantly or they get clipped.
  const inner = useRef<HTMLDivElement>(null);
  const hv = useMotionValue(0);
  const [measured, setMeasured] = useState(false);
  const swapping = useRef(false);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [moving, setMoving] = useState(false);
  const movingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const markMoving = () => {
    setMoving(true);
    clearTimeout(movingTimer.current);
    movingTimer.current = setTimeout(() => setMoving(false), SETTLE_MS);
  };
  const beginSwap = () => {
    markMoving();
    swapping.current = true;
    clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => { swapping.current = false; if (inner.current) hv.set(inner.current.offsetHeight); }, 800);
  };
  const pickLife = (v: Life) => { beginSwap(); setLife(v); };
  const pickKind = (v: Kind) => { beginSwap(); setKind(v); };
  const [limits, setLimits] = useState<Partial<Record<IpoStatus, number>>>({});
  const limitOf = (k: IpoStatus) => limits[k] ?? FIRST;

  const counts = useMemo(() => {
    const c: Record<IpoStatus, number> = { open: 0, upcoming: 0, closed: 0, listed: 0 };
    rows.forEach((r) => { c[r.status as IpoStatus]++; });
    return c;
  }, [rows]);
  const hasSme = rows.some((r) => r.board === "SME"), hasMain = rows.some((r) => r.board === "MAINBOARD");

  // Summary: best GMP among IPOs people can still act on, and the next close among live ones.
  const best = useMemo(() => rows.filter((r) => (r.status === "open" || r.status === "upcoming") && r.gmp !== null).sort((a, b) => b.gmp! - a.gmp!)[0], [rows]);
  const closing = useMemo(() => rows.filter((r) => r.status === "open" && r.close).sort((a, b) => Date.parse(a.close!) - Date.parse(b.close!))[0], [rows]);

  const groups = useMemo(
    () => GROUPS
      .filter((g) => life === "all" || life === g.key)
      .map((g) => ({ ...g, items: sortRows(rows.filter((r) => r.status === g.key && (kind === "all" || r.board === kind)), sort, dir, g.key) }))
      .filter((g) => g.items.length > 0),
    [rows, life, kind, sort, dir],
  );
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (!swapping.current) { hv.set(el.offsetHeight); setMeasured(true); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hv]);
  useEffect(() => {
    if (!swapping.current) return;
    const raf = requestAnimationFrame(() => { if (inner.current) animate(hv, inner.current.offsetHeight, { duration: duration.reveal, ease: ease.out }); });
    return () => cancelAnimationFrame(raf);
  }, [life, kind, hv]);
  const visible = groups.reduce((n, g) => n + g.items.length, 0);
  const rendered = groups.reduce((n, g) => n + Math.min(g.items.length, limits[g.key] ?? FIRST), 0);
  const glide = rendered <= LAYOUT_ANIM_MAX;   // rows per group are capped (FIRST/MORE), so this holds on phones too

  const lifeOptions: { value: Life; label: string; count?: number }[] = [
    { value: "all", label: "All", count: rows.length },
    ...GROUPS.filter((g) => counts[g.key] > 0).map((g) => ({ value: g.key as Life, label: g.key === "open" ? "Live" : g.title, count: counts[g.key] })),
  ];
  // Phone stage dropdown: same options, with the group dots and short closed-state labels ("Awaiting 12").
  const stageSelect = [
    { value: "all", label: "All", count: rows.length },
    ...GROUPS.filter((g) => counts[g.key] > 0).map((g) => ({ value: g.key, label: g.title === "Live / open" ? "Live" : g.title, short: g.key === "closed" ? "Awaiting" : g.key === "open" ? "Live" : g.title, count: counts[g.key], dot: g.dot })),
  ];
  const kindOptions: { value: Kind; label: string }[] = [{ value: "all", label: "All types" }, { value: "MAINBOARD", label: "Mainboard" }, { value: "SME", label: "SME" }];

  const toggleDir = () => { markMoving(); setDir((d) => (d === 1 ? -1 : 1)); };
  const pickSort = (v: string) => {
    const s = SORTS.find((x) => x.value === v)!;
    markMoving();
    setSort(s.value);
    setDir(s.dir);
  };

  return (
    <div data-moving={moving}>
      {/* compact overview */}
      <GlassPanel className="enter grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x [&>*]:p-4 sm:[&>*]:p-5 lg:[&>*]:px-7">
        <Stat dot="bg-gain" label="Live" value={counts.open} />
        <Stat dot="bg-info" label="Upcoming" value={counts.upcoming} />
        <Stat dot="bg-warn" label="Awaiting listing" value={counts.closed} className="border-t border-line sm:border-t-0" />
        <div className="border-t border-line sm:col-span-1 sm:border-t-0 lg:col-span-1">
          <div className="t-caption">Best GMP</div>
          {best ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 lg:flex-nowrap">
              <span className={`t-metric text-2xl ${TONE_TEXT[toneOf(best.gmp)]}`}>{gmpText(best.gmp!)}</span>
              <span className="t-small min-w-0 text-faint lg:truncate">{best.name}</span>
            </div>
          ) : <div className="mt-2 text-sm text-faint">None reported</div>}
        </div>
        <div className="col-span-2 border-t border-line sm:col-span-2 sm:border-t lg:col-span-1 lg:border-t-0">
          <div className="t-caption flex items-center gap-2">Closing soon <ClosingClock close={closing?.close ?? null} /></div>
          {closing ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 lg:flex-nowrap">
              <span className="t-metric num text-2xl">{dayMonth(closing.close)}</span>
              <span className="t-small min-w-0 text-faint lg:truncate">{closing.name}</span>
            </div>
          ) : <div className="mt-2 text-sm text-faint">No IPO is open</div>}
        </div>
      </GlassPanel>

      {/* filters + sort. One control set for every width: on a phone the stage and type controls are two compact sideways rails
          (Pills `rail`), and sort sits beside the result count; from sm: up it is the original single toolbar. */}
      <div className="enter relative z-20 mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex items-center justify-between gap-2 sm:hidden">
          <Select label="Stage" compact value={life} onChange={(v) => pickLife(v as Life)} options={stageSelect} />
          <div className="flex items-center gap-1.5">
            <Select label="Sort" compact align="right" value={sort} onChange={pickSort} options={SORTS.map((s) => ({ value: s.value, label: s.label }))} />
            <DirButton sort={sort} dir={dir} onClick={toggleDir} />
          </div>
        </div>
        <div className="hidden sm:block"><Pills label="Life-cycle stage" value={life} onChange={pickLife} options={lifeOptions} /></div>
        {hasSme && hasMain && (
          <>
            <div className="sm:hidden"><ExpandPill label="IPO type" value={kind} onChange={pickKind} options={kindOptions} /></div>
            <div className="hidden sm:block"><Pills label="IPO type" value={kind} onChange={pickKind} options={kindOptions} /></div>
          </>
        )}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Select label="Sort" value={sort} onChange={pickSort} options={SORTS.map((s) => ({ value: s.value, label: s.label }))} />
          <DirButton sort={sort} dir={dir} onClick={toggleDir} />
        </div>
      </div>
      <p className="t-small mt-3 whitespace-nowrap text-faint" aria-live="polite" aria-atomic><LiveCount value={visible} /> of {rows.length} IPOs</p>

      {/* grouped rows. A filter change keeps the rows that stay (they glide to their new spot), fades the ones that go and
          brings the new ones in; a sort reorders the same rows by gliding them. */}
      <motion.div className="relative mt-8" style={{ height: measured ? hv : "auto", overflow: "clip", overflowClipMargin: 32 }}>
        <div ref={inner} className="space-y-14">
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map((g) => {
              const shown = g.items.slice(0, limitOf(g.key));
              const rest = g.items.slice(limitOf(g.key));
              return (
                <motion.section
                  key={g.key}
                  layout={glide ? "position" : false}
                  initial={glide ? { opacity: 0, y: -6 } : false}
                  animate={{ opacity: 1, y: 0, transition: { duration: duration.transition, ease: ease.out } }}
                  exit={glide ? { opacity: 0, y: -6, pointerEvents: "none", transition: { duration: duration.interactive, ease: ease.exit } } : undefined}
                  transition={{ layout: spring.flow }}
                  aria-labelledby={`grp-${g.key}`}
                >
                  <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h3 id={`grp-${g.key}`} className="t-h3 flex items-center gap-3 text-lg">
                      <Dot cls={g.dot} />
                      {g.title}
                      <span className="num rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold text-muted"><LiveCount value={g.items.length} /></span>
                    </h3>
                    <span className="t-small hidden text-faint sm:inline">{g.note}</span>
                    <span className="h-px min-w-8 flex-1 bg-line" aria-hidden />
                  </header>

                  <div>
                    <ul className="space-y-3">
                      <AnimatePresence initial={false} mode="popLayout">
                        {shown.map((r) => (
                          <motion.li
                            key={r.slug}
                            layout={glide}
                            initial={glide ? { opacity: 0, y: 8, scale: 0.985 } : false}
                            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: duration.transition, ease: ease.out } }}
                            exit={glide ? { opacity: 0, y: -6, pointerEvents: "none", scale: 0.98, transition: { duration: duration.interactive, ease: ease.exit } } : undefined}
                            transition={{ layout: spring.flow }}
                          >
                            <BoardRow r={r} />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                    {rest.length > 0 && (
                      <>
                        <div className="mt-5 flex justify-center">
                          <button type="button" onClick={() => setLimits((l) => ({ ...l, [g.key]: limitOf(g.key) + MORE }))} className="hit group btn btn-ghost">
                            Show {Math.min(MORE, rest.length)} more <span className="text-faint">· {rest.length} left</span> <Icon name="down" size={15} className="ico-down" />
                          </button>
                        </div>
                        {/* Not-yet-shown IPOs stay in the page as plain links, so they remain crawlable without mounting a full row each. */}
                        <ul className="sr-only">
                          {rest.map((r) => <li key={r.slug}><a href={`/ipo/${r.slug}`}>{r.name}</a></li>)}
                        </ul>
                      </>
                    )}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
          {groups.length === 0 && (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-8 text-center text-faint sm:p-12">No IPOs match these filters.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const Stat = ({ dot, label, value, className }: { dot: string; label: string; value: number; className?: string }) => (
  <div className={className}>
    <div className="t-caption flex items-center gap-2"><Dot cls={dot} />{label}</div>
    <div className="t-metric mt-2 text-3xl">{value}</div>
  </div>
);
