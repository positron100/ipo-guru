import type { Metadata } from "next";
import type { Ipo, IpoStatus } from "./types";
import { deriveIpo } from "./gmp";
import { dateOnly, pct, rupee, crore } from "./format";
import { SITE_NAME } from "./site";

export const STATUS_LABEL: Record<IpoStatus, string> = {
  upcoming: "Upcoming", open: "Open", closed: "Closed (awaiting listing)", listed: "Listed",
};

/** Count of independent useful facts beyond the name. Thin = fewer than 2. */
export function factCount(i: Ipo): number {
  const dateCount = Object.values(i.dates).filter(Boolean).length;
  return [
    i.priceBand.max !== null,
    i.issueSizeCr !== null,
    i.lotSize !== null,
    dateCount >= 2,
    i.gmp !== null,
    i.listing.listingPrice !== null,
  ].filter(Boolean).length;
}
export const isThin = (i: Ipo) => factCount(i) < 2;

export function ipoDescription(i: Ipo): string {
  const parts: string[] = [`${i.name} IPO (${i.board === "SME" ? "SME" : i.board === "MAINBOARD" ? "mainboard" : "India"}) is ${STATUS_LABEL[i.status].toLowerCase()}.`];
  if (i.priceBand.max !== null) parts.push(`Price band ${i.priceBand.min !== null && i.priceBand.min !== i.priceBand.max ? `${rupee(i.priceBand.min)}–` : ""}${rupee(i.priceBand.max)}.`);
  if (i.dates.open && i.dates.close) parts.push(`Subscription ${dateOnly(i.dates.open)} to ${dateOnly(i.dates.close)}.`);
  if (i.dates.listing) parts.push(`Listing ${dateOnly(i.dates.listing)}.`);
  if (i.issueSizeCr !== null) parts.push(`Issue size ${crore(i.issueSizeCr)}.`);
  const dv = deriveIpo(i);
  if (dv.estGainPct !== null) parts.push(`Unofficial grey-market premium implies ${pct(dv.estGainPct)} vs the upper band; not investment advice.`);
  return parts.join(" ").slice(0, 300);
}

export function ipoMetadata(i: Ipo): Metadata {
  const title = `${i.name} IPO GMP, Price Band, Dates & Status`;
  const description = ipoDescription(i);
  const url = `/ipo/${i.slug}`;
  return {
    title, description,
    alternates: { canonical: url },
    robots: isThin(i) ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url, type: "article", siteName: SITE_NAME },
    twitter: { card: "summary", title, description },
  };
}

export const breadcrumbLd = (base: string, items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, k) => ({ "@type": "ListItem", position: k + 1, name: it.name, item: `${base}${it.path}` })),
});
