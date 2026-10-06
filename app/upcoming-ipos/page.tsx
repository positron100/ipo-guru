import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipo-data";
import { IpoCard, CardGrid, PageHeader, Section, Disclaimer, Empty } from "@/components/ui";
import { GlassCard } from "@/components/glass/GlassStatic";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, isThin } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { dateTimeIST } from "@/lib/format";
import { WarmIdle } from "@/components/nav/Prefetch";

export const revalidate = 14400;
export const metadata: Metadata = {
  title: "Upcoming IPOs in India: Dates, Price Band and Status",
  description:
    "Upcoming Indian IPOs with opening and closing dates, price band and issue size where announced, plus IPOs announced but still awaiting details.",
  alternates: { canonical: "/upcoming-ipos" },
  openGraph: { url: "/upcoming-ipos", title: "Upcoming IPOs in India" },
};

const t = (v: string | null) => (v ? Date.parse(v) : Infinity);

export default async function Page() {
  const { ipos, fetchedAt } = await getAllIpos();
  const up = ipos.filter((i) => i.status === "upcoming").sort((a, b) => t(a.dates.open) - t(b.dates.open));
  const detailed = up.filter((i) => !isThin(i));
  const pending = up.filter(isThin);
  return (
    <>
      <JsonLd data={breadcrumbLd(siteUrl(), [{ name: "Home", path: "/" }, { name: "Upcoming IPOs", path: "/upcoming-ipos" }])} />
      <WarmIdle hrefs={detailed.slice(0, 3).map((i) => `/ipo/${i.slug}`)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Upcoming IPOs" }]} />
      <PageHeader title="Upcoming IPOs in India">
        IPOs that have been announced but have not opened for subscription yet. Dates and price bands appear once the company or
        exchange publishes them. Data fetched {dateTimeIST(fetchedAt)}.
      </PageHeader>
      <div className="enter mt-6" style={{ "--i": 1 } as React.CSSProperties}><Disclaimer /></div>
      <Section title="With announced details">
        {detailed.length ? (
          <CardGrid>{detailed.map((i, k) => <IpoCard key={i.slug} ipo={i} index={k} />)}</CardGrid>
        ) : <Empty>No upcoming IPO has published its dates or price band yet.</Empty>}
      </Section>
      {pending.length > 0 && (
        <Section title="Announced, details pending" note="These companies appear in the data feed but dates and pricing are not available yet.">
          <GlassCard as="ul" className="divide-y divide-line">
            {pending.map((i) => (
              <li key={i.slug} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="size-1.5 rounded-full bg-line-strong" aria-hidden />{i.name}
              </li>
            ))}
          </GlassCard>
        </Section>
      )}
    </>
  );
}
