import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllIpos, getIpo, getIpoDetail, getSource } from "@/lib/ipo-data";
import { deriveIpo } from "@/lib/gmp";
import { breadcrumbLd, ipoMetadata, isThin, STATUS_LABEL } from "@/lib/seo";
import { crore, dateOnly, dateTimeIST, rupee, signedRupee, times } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Unavailable } from "@/components/Unavailable";
import { GmpChart } from "@/components/GmpChart";
import { GmpHero } from "@/components/GmpHero";
import { Metric } from "@/components/Metric";
import { Timeline } from "@/components/Timeline";
import { SubscriptionSection } from "@/components/subscription/SubscriptionSection";
import { buildSubscription } from "@/lib/subscription";
import { Disclaimer, Empty, Section, StatusBadge } from "@/components/ui";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { PctPill, gmpText } from "@/components/Gmp";
import type { Ipo } from "@/lib/types";

export const revalidate = 14400;

type Props = { params: Promise<{ slug: string }> };

/** Pages are built from the cached list, so prerendering every indexable IPO costs no extra upstream calls. */
export async function generateStaticParams() {
  try {
    // Providers that enrich each page with extra requests (IPO Watch scraper) render on demand instead of at build time.
    if (getSource().enriched) return [];
    const { ipos } = await getAllIpos();
    return ipos.filter((i) => !isThin(i)).map((i) => ({ slug: i.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const found = await getIpo(slug);
    return found ? ipoMetadata(found.ipo) : { robots: { index: false } };
  } catch {
    return { title: "IPO data temporarily unavailable", robots: { index: false } }; // body shows <Unavailable />
  }
}

function summary(i: Ipo): string {
  const board = i.board === "SME" ? "an SME" : i.board === "MAINBOARD" ? "a mainboard" : "an";
  const bits = [`${i.name} is ${board} IPO. Its status is ${STATUS_LABEL[i.status].toLowerCase()}.`];
  if (i.dates.open && i.dates.close) bits.push(`Bidding runs from ${dateOnly(i.dates.open)} to ${dateOnly(i.dates.close)}.`);
  if (i.priceBand.max !== null) {
    const band = i.priceBand.min !== null && i.priceBand.min !== i.priceBand.max ? `${rupee(i.priceBand.min)} to ${rupee(i.priceBand.max)}` : rupee(i.priceBand.max);
    bits.push(`The price band is ${band} per share${i.lotSize ? `, with a lot of ${i.lotSize} shares` : ""}.`);
  }
  if (i.issueSizeCr !== null) bits.push(`The issue size is ${crore(i.issueSizeCr)}.`);
  if (i.dates.listing) bits.push(`${i.status === "listed" ? "It listed" : "Listing is expected"} on ${dateOnly(i.dates.listing)}.`);
  return bits.join(" ");
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  let found;
  try {
    found = await getIpoDetail(slug);
  } catch {
    return <Unavailable />; // only reachable with a cold data cache; metadata marks this noindex
  }
  if (!found) notFound();
  const { ipo, fetchedAt } = found;
  const d = deriveIpo(ipo);
  const gmp = ipo.gmp?.value ?? null;
  const gmpUpdatedAt = ipo.gmp?.updatedAt ?? null;
  const board = ipo.board === "SME" ? "SME" : ipo.board === "MAINBOARD" ? "Mainboard" : null;

  const timeline = [
    { label: "Opens", date: ipo.dates.open }, { label: "Closes", date: ipo.dates.close }, { label: "Allotment", date: ipo.dates.allotment },
    { label: "Refunds", date: ipo.dates.refund }, { label: "Credit to demat", date: ipo.dates.demat }, { label: "Listing", date: ipo.dates.listing },
  ] as const;

  const faq: { q: string; a: string }[] = [];
  if (ipo.priceBand.max !== null)
    faq.push({ q: `What is the ${ipo.name} IPO price band?`, a: `The upper end of the price band is ${rupee(ipo.priceBand.max)} per share${ipo.priceBand.min !== null && ipo.priceBand.min !== ipo.priceBand.max ? ` and the lower end is ${rupee(ipo.priceBand.min)}` : ""}.` });
  if (d.minInvestment !== null)
    faq.push({ q: `What is the minimum investment for the ${ipo.name} IPO?`, a: `One lot is ${ipo.lotSize} shares, which at the upper band comes to ${rupee(d.minInvestment)}.` });
  if (ipo.dates.open && ipo.dates.close)
    faq.push({ q: `When does the ${ipo.name} IPO open and close?`, a: `Subscription opens on ${dateOnly(ipo.dates.open)} and closes on ${dateOnly(ipo.dates.close)}.` });
  if (ipo.dates.listing)
    faq.push({ q: `When is the ${ipo.name} listing date?`, a: `The listing date is ${dateOnly(ipo.dates.listing)}.` });
  if (d.estListingPrice !== null)
    faq.push({ q: `How is the estimated listing price calculated?`, a: `We add the reported GMP (${signedRupee(gmp)}) to the upper price band (${rupee(ipo.priceBand.max)}), giving ${rupee(d.estListingPrice)}. This is arithmetic on unofficial data, not a prediction.` });

  const bandLabel =
    ipo.priceBand.max === null ? null
    : ipo.priceBand.min !== null && ipo.priceBand.min !== ipo.priceBand.max ? `${rupee(ipo.priceBand.min)} – ${rupee(ipo.priceBand.max)}`
    : rupee(ipo.priceBand.max);

  const url = `${siteUrl()}/ipo/${ipo.slug}`;
  return (
    <>
      <JsonLd data={breadcrumbLd(siteUrl(), [{ name: "Home", path: "/" }, { name: "IPO GMP today", path: "/ipo-gmp-today" }, { name: ipo.name, path: `/ipo/${ipo.slug}` }])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: `${ipo.name} IPO GMP, Price Band, Dates & Status`, url, dateModified: gmpUpdatedAt ?? fetchedAt, inLanguage: "en-IN" }} />
      {faq.length > 0 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      )}

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "IPO GMP today", path: "/ipo-gmp-today" }, { name: ipo.name }]} />
      <header className="enter mt-5" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="t-h1">{ipo.name} IPO GMP</h1>
          <StatusBadge status={ipo.status} />
          {board && <span className="t-caption rounded-full border border-line px-2.5 py-1">{board}</span>}
        </div>
        <p className="t-small mt-3 text-faint">
          Data fetched: <time dateTime={fetchedAt}>{dateTimeIST(fetchedAt)}</time>
          {gmpUpdatedAt && <> · GMP updated: <time dateTime={gmpUpdatedAt}>{dateTimeIST(gmpUpdatedAt)}</time></>}
        </p>
        <p className="t-body mt-5 max-w-4xl text-lg">{summary(ipo)}</p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-6 lg:mt-14 lg:grid-cols-12 lg:gap-6">
        <Metric label="Price band" icon="tag" size="lg" value={bandLabel} sub="per share" index={2} className="sm:col-span-6 lg:col-span-5" />
        <Metric label="Lot size" icon="layers" value={ipo.lotSize !== null ? `${ipo.lotSize} shares` : null} sub={d.minInvestment !== null ? `Min. ${rupee(d.minInvestment)}` : null} index={3} className="sm:col-span-3 lg:col-span-3" />
        <Metric label="Issue size" icon="pie" value={crore(ipo.issueSizeCr)} sub={ipo.freshIssueCr !== null ? `Fresh ${crore(ipo.freshIssueCr)}` : null} index={4} className="sm:col-span-3 lg:col-span-4" />
      </div>

      <div className="mt-6"><Disclaimer /></div>

      <Section title="Grey-market premium (unofficial)">
        {gmp === null ? (
          <Empty>
            {ipo.status === "upcoming" || ipo.status === "open"
              ? "No GMP has been reported for this IPO yet. It is shown as unavailable, not as zero."
              : "No GMP is available for this IPO. It is shown as unavailable, not as zero."}
          </Empty>
        ) : (
          <GmpHero ipo={ipo} />
        )}
      </Section>

      <div className={ipo.history && ipo.history.length > 0 ? "xl:grid xl:grid-cols-2 xl:gap-x-12" : ""}>
      {/* Rendered only when history is populated (Standard plan, not enabled on the Free MVP). */}
      {ipo.history && ipo.history.length > 0 && (
        <Section title="GMP history">
          <GlassPanel className="space-y-6 p-6 sm:p-8">
            <p className="t-small text-faint">Unofficial grey-market readings reported by {ipo.gmp?.source ?? ipo.history[0]?.source ?? "the data provider"}; not exchange data.</p>
            <GmpChart points={ipo.history} />
            <details className="group border-t border-line pt-4">
              <summary className="hit-text t-small cursor-pointer select-none font-medium text-muted transition-colors hover:text-fg">Show readings as a table</summary>
              <table className="mt-3 w-full max-w-md text-left text-sm">
                <thead><tr className="border-b border-line"><th scope="col" className="t-caption py-2">Date</th><th scope="col" className="t-caption py-2 text-right">GMP (₹/share)</th></tr></thead>
                <tbody>
                  {ipo.history.map((p) => (
                    <tr key={p.observedAt} className="border-b border-line last:border-0">
                      <td className="py-2">{dateOnly(p.observedAt)}</td>
                      <td className="num py-2 text-right">{gmpText(p.gmp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </GlassPanel>
        </Section>
      )}

      <Section title="Issue details">
        <div className="@container"><div className="grid grid-cols-2 gap-4 @xl:grid-cols-3 @4xl:grid-cols-4">
          <Metric size="sm" label="Upper price band" value={rupee(ipo.priceBand.max)} />
          <Metric size="sm" label="Lower price band" value={rupee(ipo.priceBand.min)} />
          <Metric size="sm" label="Fresh issue" value={crore(ipo.freshIssueCr)} />
          <Metric size="sm" label="Offer for sale" value={ipo.offerForSale ? (ipo.offerForSale.cr !== null ? crore(ipo.offerForSale.cr) : ipo.offerForSale.raw) : null} />
          <Metric size="sm" label="Listing on" value={ipo.listingExchange} />
          <Metric size="sm" label="Minimum investment" value={rupee(d.minInvestment)} />
          <Metric size="sm" label="Board" value={board} />
          <Metric size="sm" label="Issue size" value={crore(ipo.issueSizeCr)} />
        </div></div>
        <p className="t-small mt-4 text-faint">Minimum investment = upper price band × lot size.</p>
      </Section>

      </div>

      <Section title="Timeline">
        <Timeline stages={timeline} />
      </Section>

      <Section title="Subscription" note="Investor demand across the issue.">
        {ipo.subscription && buildSubscription(ipo.subscription) ? (
          <SubscriptionSection data={ipo.subscription} />
        ) : ipo.subscriptionTotalX !== null ? (
          <GlassPanel className="flex items-baseline gap-3 p-6">
            <span className="t-metric text-3xl">{times(ipo.subscriptionTotalX)}</span>
            <span className="t-body">overall subscription. A category-wise breakdown is not available.</span>
          </GlassPanel>
        ) : (
          <Empty>Subscription figures have not been reported for this IPO.</Empty>
        )}
      </Section>

      {ipo.status === "listed" && (
        <Section title="Listing outcome">
          {ipo.listing.listingPrice !== null ? (
            <GlassPanel className="grid gap-6 p-6 sm:grid-cols-3">
              <Out label="Issue price" value={rupee(ipo.listing.issuePrice ?? ipo.priceBand.max)} />
              <Out label="Listing price" value={rupee(ipo.listing.listingPrice)} />
              <div>
                <div className="t-caption">Listing gain</div>
                <div className="mt-2"><PctPill value={ipo.listing.gainPct} className="!px-3 !py-1.5 !text-lg" />{ipo.listing.gainPct === null && <span className="text-faint">Not available</span>}</div>
              </div>
            </GlassPanel>
          ) : <Empty>The listing price has not been reported for this IPO.</Empty>}
        </Section>
      )}

      {faq.length > 0 && (
        <Section title="Quick answers">
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            {faq.map((f) => (
              <details key={f.q} className="glass glass-card group transition-colors open:bg-[var(--surface-hover)]">
                <summary className="group flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-line text-muted transition-transform duration-300 group-hover:scale-110 group-open:rotate-45">+</span>
                </summary>
                <p className="t-body px-6 pb-5">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

const Out = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <div className="t-caption">{label}</div>
    <div className="t-metric mt-2 text-3xl">{value ?? <span className="text-base font-normal text-faint">Not available</span>}</div>
  </div>
);
