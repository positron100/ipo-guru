import Link from "next/link";
import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipo-data";
import { IpoCard, CardGrid, Section, Disclaimer, Empty } from "@/components/ui";
import { isThin } from "@/lib/seo";
import { dateTimeIST } from "@/lib/format";
import { deriveIpo } from "@/lib/gmp";
import { GlassCard } from "@/components/glass/GlassStatic";
import { Magnetic } from "@/components/motion/Magnetic";
import { CtaArrow } from "@/components/Breathing";
import { Typewriter } from "@/components/Typewriter";
import { Spotlight } from "@/components/Spotlight";
import { WarmIdle } from "@/components/nav/Prefetch";

export const revalidate = 14400;
export const metadata: Metadata = {
  title: { absolute: "Indian IPO GMP Today: Open & Upcoming IPOs, Dates and Status" },
  alternates: { canonical: "/" },
};

const t = (v: string | null) => (v ? Date.parse(v) : Infinity);

export default async function Home() {
  const { ipos, fetchedAt } = await getAllIpos();
  const open = ipos.filter((i) => i.status === "open").sort((a, b) => t(a.dates.close) - t(b.dates.close));
  const upcomingAll = ipos.filter((i) => i.status === "upcoming");
  const upcoming = upcomingAll.filter((i) => !isThin(i)).sort((a, b) => t(a.dates.open) - t(b.dates.open)).slice(0, 6);
  const withGmp = ipos
    .filter((i) => i.gmp && (i.status === "open" || i.status === "closed"))
    .sort((a, b) => (Date.parse(b.gmp?.updatedAt ?? "") || 0) - (Date.parse(a.gmp?.updatedAt ?? "") || 0))
    .slice(0, 6);

  // Spotlight: open IPO with the highest derivable GMP % (never treats a missing GMP as zero), else the first open one.
  const ranked = open.map((i) => ({ i, p: deriveIpo(i).estGainPct })).filter((x): x is { i: typeof x.i; p: number } => x.p !== null).sort((a, b) => b.p - a.p);
  const spotlight = ranked[0]?.i ?? open[0] ?? null;
  const stats = [
    { label: "Open now", value: String(open.length), sub: "accepting bids" },
    { label: "Upcoming", value: String(upcomingAll.length), sub: "announced" },
    { label: "Reporting GMP", value: String(ipos.filter((i) => i.gmp && (i.status === "open" || i.status === "upcoming")).length), sub: "open + upcoming" },
    { label: "Tracked", value: String(ipos.length), sub: "IPOs in the last 12 months" },
  ];

  return (
    <>
      <WarmIdle hrefs={open.slice(0, 4).map((i) => `/ipo/${i.slug}`)} />
      <section className="grid items-stretch gap-8 sm:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14 xl:gap-20">
        <div className="flex flex-col justify-center">
          <div className="enter t-small inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-muted">
            <span className="live-dot text-gain" aria-hidden /> Data fetched {dateTimeIST(fetchedAt)}
          </div>
          <h1 className="t-display enter mt-6 sm:mt-8" style={{ "--i": 1 } as React.CSSProperties}>
            <Typewriter
              loop={false}
              label="Indian IPOs, GMP and status at a glance."
              parts={[
                { text: "Indian IPOs, " },
                { text: "GMP and status", words: ["GMP and status", "price bands", "dates and lots", "listing gains"], className: "bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent" },
                { text: " at a glance." },
              ]}
            />
          </h1>
          <p className="t-body enter mt-5 max-w-xl text-base sm:mt-7 sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            IPOs open or coming up on NSE and BSE, with the unofficial grey-market premium set against the price band, so you can see what market chatter implies.
          </p>
          <div className="enter mt-7 flex flex-wrap gap-3 sm:mt-10 sm:gap-4" style={{ "--i": 3 } as React.CSSProperties}>
            <Magnetic strength={10}><Link href="/ipo-gmp-today" className="btn btn-primary !px-7 !py-4 !text-base">Live GMP table <CtaArrow size={17} /></Link></Magnetic>
            <Magnetic strength={5}><Link href="/upcoming-ipos" className="btn btn-ghost relative overflow-hidden !px-6 !py-3.5 !text-[0.9375rem] sm:!px-7 sm:!py-4 sm:!text-base">
              Upcoming IPOs
              {/* Slow diagonal swipe (ported from the portfolio's .cp-swipe): an accent stripe crosses the button and the label inverts inside it. */}
              <span aria-hidden="true" className="swipe max-sm:hidden"><span className="swipe__inner">Upcoming IPOs</span></span>
            </Link></Magnetic>
          </div>
        </div>
        {spotlight && <Spotlight ipo={spotlight} />}
      </section>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 lg:mt-20 lg:grid-cols-4 lg:gap-6">
        {stats.map((s, k) => (
          <GlassCard key={s.label} className="enter p-4 sm:p-6 lg:p-8" style={{ "--i": 4 + k } as React.CSSProperties}>
            <p className="t-caption">{s.label}</p>
            <p className="t-metric mt-3 text-4xl sm:mt-4 sm:text-5xl lg:text-6xl">{s.value}</p>
            <p className="t-small mt-2 text-faint sm:mt-3 lg:truncate">{s.sub}</p>
          </GlassCard>
        ))}
      </div>

      <div className="enter mt-8 sm:mt-14" style={{ "--i": 8 } as React.CSSProperties}><Disclaimer /></div>

      <Section title="Open for subscription" note="Sorted by closing date.">
        {open.length ? (
          <CardGrid>{open.map((i, k) => <IpoCard key={i.slug} ipo={i} index={k} />)}</CardGrid>
        ) : <Empty>No IPOs are open for subscription right now.</Empty>}
      </Section>

      <Section title="Upcoming IPOs" action={{ href: "/upcoming-ipos", label: "All upcoming IPOs" }}>
        {upcoming.length ? <CardGrid>{upcoming.map((i, k) => <IpoCard key={i.slug} ipo={i} index={k} />)}</CardGrid>
          : <Empty>No upcoming IPOs with confirmed details yet.</Empty>}
      </Section>

      <Section title="Latest GMP updates" note="Open and recently closed IPOs that have a reported GMP." action={{ href: "/ipo-gmp-today", label: "Full sortable GMP table" }}>
        {withGmp.length ? <CardGrid>{withGmp.map((i, k) => <IpoCard key={i.slug} ipo={i} index={k} />)}</CardGrid>
          : <Empty>No GMP has been reported for current IPOs yet.</Empty>}
      </Section>
    </>
  );
}
