import Link from "next/link";
import { WarmLink } from "@/components/nav/Prefetch";
import type { Ipo, IpoStatus } from "@/lib/types";
import { dayMonth, rupee, shortIST } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/seo";
import { GlowCard } from "@/components/glass/Glass";
import { GmpBlock } from "@/components/Gmp";
import { Icon } from "@/components/Icon";
import { ClosingClock, CtaArrow } from "@/components/Breathing";
import { InView } from "@/components/motion/InView";

const BADGE: Record<IpoStatus, string> = {
  upcoming: "bg-info-soft text-info",
  open: "bg-gain-soft text-gain",
  closed: "bg-warn-soft text-warn",
  listed: "bg-line text-muted",
};
const SHORT: Record<IpoStatus, string> = { upcoming: "Upcoming", open: "Open", closed: "Closed", listed: "Listed" };
export const StatusBadge = ({ status, short = false }: { status: IpoStatus; short?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[status]}`}>
    {status === "open" && <span className="live-dot" aria-hidden />}
    {short ? SHORT[status] : STATUS_LABEL[status]}
  </span>
);

const boardLabel = (b: Ipo["board"]) => (b === "SME" ? "SME" : b === "MAINBOARD" ? "Mainboard" : null);

/** The whole card is one link (a real <a> via Next's Link): any click, tap, Enter or middle-click on it opens the IPO. The name only reflects the card's hover/focus. */
export function IpoCard({ ipo, featured = false, index = 0 }: { ipo: Ipo; featured?: boolean; index?: number }) {
  const board = boardLabel(ipo.board);
  return (
    <GlowCard as={WarmLink} warm href={`/ipo/${ipo.slug}`} className={`${index < 4 ? "enter" : "reveal"} group flex cursor-pointer flex-col gap-5 p-5 sm:gap-6 sm:p-6 lg:p-7 ${featured ? "sm:col-span-2 lg:p-8" : ""}`} style={{ "--i": index } as React.CSSProperties}>
      <div className="kid flex items-start justify-between gap-3" style={{ "--i": index, "--c": 0 } as React.CSSProperties}>
        <div className="min-w-0">
          <h3 className={`${featured ? "text-2xl" : "text-lg"} font-semibold leading-snug tracking-tight`}>
            <span className="line-clamp-2 transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent group-active:text-accent">{ipo.name}</span>
          </h3>
          {board && <div className="t-caption mt-1.5">{board}</div>}
        </div>
        <span className="sm:hidden"><StatusBadge status={ipo.status} short /></span>
        <span className="hidden sm:inline-flex"><StatusBadge status={ipo.status} /></span>
      </div>

      <div className="kid" style={{ "--i": index, "--c": 1 } as React.CSSProperties}><GmpBlock ipo={ipo} large={featured} /></div>

      <dl className="kid mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4 text-[0.875rem] sm:pt-5 sm:text-[0.9375rem]" style={{ "--i": index, "--c": 2 } as React.CSSProperties}>
        <Stat label="Upper band" value={rupee(ipo.priceBand.max)} />
        <Stat label="Opens" value={dayMonth(ipo.dates.open)} />
        <Stat label="Closes" value={dayMonth(ipo.dates.close)} extra={ipo.status === "open" ? <ClosingClock close={ipo.dates.close} /> : undefined} />
      </dl>

      {ipo.gmp?.updatedAt && <div className="sr-only">GMP updated {shortIST(ipo.gmp.updatedAt)}</div>}
    </GlowCard>
  );
}

const Stat = ({ label, value, extra }: { label: string; value: string | null; extra?: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="t-caption flex items-center gap-1.5">{label}{extra}</dt>
    <dd className="num mt-1 truncate font-medium">{value ?? <span className="font-normal text-faint">–</span>}</dd>
  </div>
);

export const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">{children}</div>
);

export const Section = ({ title, children, note, action }: { title: string; children: React.ReactNode; note?: string; action?: { href: string; label: string } }) => (
  <section className="reveal mt-12 sm:mt-16 lg:mt-24">
    <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 lg:mb-8">
      <div>
        <h2 className="t-h2 flex items-center gap-2.5">
          <span className="h-6 w-1 rounded-full bg-gradient-to-b from-accent to-accent-2" aria-hidden />
          {title}
        </h2>
        {note && <p className="t-small mt-2 pl-3.5 text-faint">{note}</p>}
      </div>
      {action && (
        <Link href={action.href} className="hit-text group link t-small inline-flex shrink-0 items-center gap-1.5 font-medium text-muted">{action.label} <CtaArrow size={14} /></Link>
      )}
    </div>
    <InView>{children}</InView>
  </section>
);

export function Disclaimer() {
  return (
    <aside role="note" className="glass glass-card flex gap-3 border-warn/25 bg-warn-soft p-4 text-sm sm:gap-4 sm:p-5 sm:text-[0.9375rem] leading-relaxed text-fg lg:px-7">
      <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-warn" />
      <p className="text-muted">
        <strong className="font-semibold text-fg">Grey-market premium (GMP) is unofficial, unregulated sentiment.</strong> It is not published by any exchange or regulator, can change quickly or be wrong,
        and is not investment advice or a guaranteed listing prediction. Do your own research and read the offer documents.
      </p>
    </aside>
  );
}

export const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-8 text-center text-base text-faint sm:p-12">{children}</p>
);

/** Page title block shared by the list pages. */
export const PageHeader = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="enter mt-6">
    <h1 className="t-h1">{title}</h1>
    <p className="t-body mt-4 max-w-3xl text-lg">{children}</p>
  </div>
);
