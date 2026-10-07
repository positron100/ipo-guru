import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipo-data";
import { MarketBoard } from "@/components/MarketBoard";
import { Disclaimer, Empty, Section } from "@/components/ui";
import { FeaturedMover, MoverCard, SummaryTile } from "@/components/GmpMovers";
import { Fresh } from "@/components/Fresh";
import { WarmIdle } from "@/components/nav/Prefetch";
import { toRow } from "@/lib/rows";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { pct } from "@/lib/format";
import { deriveIpo } from "@/lib/gmp";
import { TONE_TEXT, toneOf } from "@/components/Gmp";
import type { Ipo } from "@/lib/types";

export const revalidate = 14400;
export const metadata: Metadata = {
  title: "IPO GMP Today: Grey Market Premium for Open & Upcoming IPOs",
  description:
    "Sortable table of unofficial grey-market premium (GMP) for Indian IPOs, with upper price band, estimated listing price and listing dates. GMP is not advice.",
  alternates: { canonical: "/ipo-gmp-today" },
  openGraph: { url: "/ipo-gmp-today", title: "IPO GMP Today" },
};

const t = (v: string | null) => (v ? Date.parse(v) : 0);
const ORDER = { open: 0, upcoming: 1, closed: 2, listed: 3 } as const;
const css = (o: Record<string, string | number>) => o as React.CSSProperties;

export default async function Page() {
  const { ipos, fetchedAt } = await getAllIpos();
  const rows = [...ipos]
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || t(b.dates.close) - t(a.dates.close))
    .map(toRow);

  // Movers: IPOs people can still act on (open, upcoming) with a derivable gain %. A missing GMP is never treated as zero.
  // If nothing active reports a GMP, fall back to closed IPOs so the page is never empty of context.
  const withGain = (list: Ipo[]) =>
    list.map((i) => ({ i, g: deriveIpo(i).estGainPct })).filter((x): x is { i: Ipo; g: number } => x.g !== null && x.i.gmp !== null);
  let pool = withGain(ipos.filter((i) => i.status === "open" || i.status === "upcoming"));
  const fallback = pool.length === 0;
  if (fallback) pool = withGain(ipos.filter((i) => i.status === "closed"));
  pool.sort((a, b) => b.g - a.g);
  const [top, ...rest] = pool;
  const movers = rest.slice(0, 6);
  const maxGain = Math.max(0, ...pool.map((x) => Math.abs(x.g)));

  const gains = pool.map((x) => x.g);
  const avg = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
  const up = gains.filter((g) => g > 0).length, down = gains.filter((g) => g < 0).length;
  const openHrefs = ipos.filter((i) => i.status === "open").slice(0, 4).map((i) => `/ipo/${i.slug}`);

  return (
    <>
      <JsonLd data={breadcrumbLd(siteUrl(), [{ name: "Home", path: "/" }, { name: "IPO GMP today", path: "/ipo-gmp-today" }])} />
      <WarmIdle hrefs={openHrefs} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "IPO GMP today" }]} />

      <header className="mt-6 grid items-end gap-5 sm:gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div>
          <div className="enter"><Fresh iso={fetchedAt} label="Data updated" className="rounded-full border border-line bg-surface px-3.5 py-2" /></div>
          <h1 className="t-display enter mt-5 sm:mt-7" style={css({ "--i": 1 })}>
            IPO GMP{" "}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">today</span>
          </h1>
        </div>
        <p className="t-body enter line-clamp-3 max-w-xl text-base sm:line-clamp-none sm:text-lg lg:pb-3" style={css({ "--i": 2 })}>
          Grey-market premium is the unofficial extra (or discount) per share at which an IPO trades before listing. Here it is set against
          each IPO&apos;s upper price band. &ldquo;Est. listing price&rdquo; is simply upper band + GMP, and GMP % is GMP ÷ upper band.
          Neither is a forecast.
        </p>
      </header>

      <div className="enter mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4 lg:gap-6" style={css({ "--i": 3 })}>
        <SummaryTile index={3} label={fallback ? "Closed, reporting GMP" : "Reporting GMP"} value={pool.length} sub={fallback ? "no open or upcoming IPO has a GMP" : "open + upcoming IPOs"} />
        <SummaryTile
          index={4}
          label="Average GMP"
          value={<span className={avg === null ? "" : TONE_TEXT[toneOf(avg)]}>{avg === null ? "–" : pct(avg)}</span>}
          sub="of upper band, across those IPOs"
        />
        <SummaryTile index={5} label="Premium / discount" value={<>{up} <span className="text-faint">/</span> {down}</>} sub={`${gains.length - up - down} flat`} />
        <SummaryTile index={6} label="Highest" value={top ? <span className={TONE_TEXT[toneOf(top.g)]}>{pct(top.g)}</span> : "–"} sub={top?.i.name ?? "no GMP reported"} />
      </div>

      <div className="enter mt-6 sm:mt-10" style={css({ "--i": 4 })}><Disclaimer /></div>

      {top ? (
        <Section title={fallback ? "Top recent GMP" : "Top GMP mover"} note="Ranked by estimated gain: GMP ÷ upper band.">
          <FeaturedMover ipo={top.i} rank={1} of={pool.length} />
        </Section>
      ) : (
        <Section title="Top GMP mover"><Empty>No IPO is reporting a GMP right now.</Empty></Section>
      )}

      {movers.length > 0 && (
        <Section title="Next movers" note="Next biggest estimated gains; the bar compares each with the leader.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {movers.map((m, k) => <MoverCard key={m.i.slug} ipo={m.i} rank={k + 2} maxGain={maxGain} index={k} />)}
          </div>
        </Section>
      )}

      <Section title="All tracked IPOs" note="Every IPO we track, grouped by where it is in its life cycle.">
        <MarketBoard rows={rows} />
      </Section>
    </>
  );
}
