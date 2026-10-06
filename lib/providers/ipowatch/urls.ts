// IPOWATCH_BASE_URL exists only so tests and local mirrors can point the scraper somewhere else.
export const IPOWATCH_ORIGIN = (process.env.IPOWATCH_BASE_URL ?? "https://ipowatch.in").replace(/[/]+$/, "");
const HOST = new URL(IPOWATCH_ORIGIN).hostname;

// Listing pages that together cover the current IPO calendar (3 requests per refresh, no crawling).
export const LISTING_URLS = {
  gmp: `${IPOWATCH_ORIGIN}/ipo-grey-market-premium-latest-ipo-gmp/`,
  upcoming: `${IPOWATCH_ORIGIN}/upcoming-ipo-list/`,
  subscription: `${IPOWATCH_ORIGIN}/ipo-subscription-status-today/`,
} as const;

// IPO Watch slugs end in "-ipo" ("vishal-nirmiti-ipo"). Strict validation keeps arbitrary paths/hosts out of our requests.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*-ipo$/;
export const isValidSlug = (s: string): boolean => SLUG.test(s);

/** Slug from an IPO Watch link ("/x-ipo/", "https://ipowatch.in/x-ipo/"). Other hosts and non-IPO paths give null. */
export function slugFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  let path: string;
  try {
    const u = new URL(href, IPOWATCH_ORIGIN);
    if (u.hostname !== HOST && u.hostname !== `www.${HOST}`) return null;
    path = u.pathname;
  } catch {
    return null;
  }
  const seg = path.split("/").filter(Boolean);
  if (seg.length !== 1) return null;
  const s = seg[0].toLowerCase();
  return isValidSlug(s) ? s : null;
}

function need(slug: string): string {
  if (!isValidSlug(slug)) throw new Error(`Invalid IPO Watch slug: ${slug}`);
  return slug;
}
// Verified against current pages: /{slug}/, /{slug}-gmp-grey-market-premium/, /{slug}-subscription-status/
export const detailsUrl = (slug: string): string => `${IPOWATCH_ORIGIN}/${need(slug)}/`;
export const gmpUrl = (slug: string): string => `${IPOWATCH_ORIGIN}/${need(slug)}-gmp-grey-market-premium/`;
export const subscriptionUrl = (slug: string): string => `${IPOWATCH_ORIGIN}/${need(slug)}-subscription-status/`;
