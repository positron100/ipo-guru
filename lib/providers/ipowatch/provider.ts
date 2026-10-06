import type { Ipo, SubscriptionData } from "../../types";
import { resolveStatus, istToday } from "../../ipoguru-normalize.ts";
import { ProviderError } from "../types.ts";
import type { GmpData, IpoDataProvider, IpoListResult, ProviderCapabilities } from "../types.ts";
import { parseDetails } from "./details-parser.ts";
import { GMP_SOURCE, parseGmpPage } from "./gmp-parser.ts";
import { parseGmpListing, parseSubscriptionOverview, parseUpcomingListing } from "./listing-parser.ts";
import type { GmpListingRow, SubscriptionOverviewRow, UpcomingRow } from "./listing-parser.ts";
import { parseSubscriptionPage } from "./subscription-parser.ts";
import { LISTING_URLS, detailsUrl, gmpUrl, subscriptionUrl } from "./urls.ts";

/** listing/overview: shared list pages (required). details/gmp/subscription: optional per-IPO pages. */
export type PageKind = "listing" | "overview" | "details" | "gmp" | "subscription";

/** Fetches one HTML page. Returns null for 404 (page does not exist); throws on any other failure. */
export interface PageFetcher {
  getHtml(url: string, kind: PageKind): Promise<string | null>;
}

export interface Logger {
  warn(msg: string, ...rest: unknown[]): void;
}

const emptyIpo = (slug: string, name: string): Ipo => ({
  slug, name, board: null, status: "upcoming", priceBand: { min: null, max: null }, issueSizeCr: null, freshIssueCr: null,
  offerForSale: null, lotSize: null, listingExchange: null,
  dates: { open: null, close: null, allotment: null, refund: null, demat: null, listing: null },
  gmp: null, listing: { issuePrice: null, listingPrice: null, gainPct: null }, subscriptionTotalX: null,
});

const STATUS_LABEL: Record<string, Ipo["status"]> = { upcoming: "upcoming", open: "open", closed: "closed", listed: "listed" };

/**
 * IPO Watch scraper behind the provider interface. Development / private use only: IPO Watch's terms restrict
 * reproduction and commercial use, so this must be replaced (IPO Guru) before any public launch.
 */
export class IpoWatchProvider implements IpoDataProvider {
  readonly name = "IPO Watch";
  readonly url = "https://ipowatch.in";
  readonly capabilities: ProviderCapabilities = { details: true, gmpHistory: true, subscription: true };
  private readonly fetcher: PageFetcher;
  private readonly log: Logger;
  private readonly now: () => Date;

  constructor(fetcher: PageFetcher, opts: { logger?: Logger; now?: () => Date } = {}) {
    this.fetcher = fetcher;
    this.log = opts.logger ?? console;
    this.now = opts.now ?? (() => new Date());
  }

  /** Fetch + parse one source. A failing source is logged and skipped so the others still contribute. */
  private async source<T>(url: string, kind: PageKind, parse: (html: string) => T): Promise<T | null> {
    try {
      const html = await this.fetcher.getHtml(url, kind);
      return html === null ? null : parse(html);
    } catch (e) {
      this.log.warn(`[ipowatch] ${kind} source failed (${url}):`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  async fetchUpcomingIpos(): Promise<IpoListResult> {
    const now = this.now();
    const gmpRows = await this.source(LISTING_URLS.gmp, "listing", (h) => parseGmpListing(h, now));
    const upcoming = await this.source(LISTING_URLS.upcoming, "listing", (h) => parseUpcomingListing(h, now));
    const subs = await this.source(LISTING_URLS.subscription, "overview", (h) => parseSubscriptionOverview(h, now));
    if (!gmpRows && !upcoming && !subs) throw new ProviderError("unavailable", "IPO Watch: no listing page could be fetched");

    // Merge by slug: one record per IPO even when it appears in several listings.
    const bySlug = new Map<string, Ipo>();
    const get = (slug: string, name: string) => {
      let i = bySlug.get(slug);
      if (!i) { i = emptyIpo(slug, name); bySlug.set(slug, i); }
      return i;
    };
    for (const u of upcoming ?? []) this.applyUpcoming(get(u.slug, u.name), u);
    const labels = new Map<string, Ipo["status"]>();
    for (const g of gmpRows ?? []) {
      const st = this.applyGmp(get(g.slug, g.name), g);
      if (st) labels.set(g.slug, st);
    }
    for (const s of subs ?? []) this.applySubscription(get(s.slug, s.name), s);

    const today = istToday(now);
    const ipos = [...bySlug.values()].map((i) => ({
      ...i,
      status: resolveStatus(labels.get(i.slug) ?? null, false, i.dates, today),
    }));
    if (ipos.length === 0) throw new ProviderError("parse", "IPO Watch: listings parsed but contained no IPOs (page structure may have changed)");
    return { ipos, fetchedAt: now.toISOString() };
  }

  private applyUpcoming(i: Ipo, u: UpcomingRow) {
    i.dates.open = u.dates.open ?? i.dates.open;
    i.dates.close = u.dates.close ?? i.dates.close;
    if (u.issueSizeCr !== null) i.issueSizeCr = u.issueSizeCr;
    if (u.priceBand.max !== null) i.priceBand = u.priceBand;
  }

  private applyGmp(i: Ipo, g: GmpListingRow): Ipo["status"] | undefined {
    i.dates.open = i.dates.open ?? g.dates.open;
    i.dates.close = i.dates.close ?? g.dates.close;
    if (i.priceBand.max === null && g.priceMax !== null) i.priceBand = { min: g.priceMax, max: g.priceMax };
    // A missing GMP stays null. The listing page gives no per-reading time, so updatedAt is unknown here.
    i.gmp = g.gmp === null ? null : { value: g.gmp, providerPct: g.providerPct, updatedAt: null, source: GMP_SOURCE };
    return g.statusLabel ? STATUS_LABEL[g.statusLabel.toLowerCase()] : undefined;
  }

  private applySubscription(i: Ipo, s: SubscriptionOverviewRow) {
    i.board = s.board ?? i.board;
    i.dates.close = i.dates.close ?? s.closeDate;
    i.subscriptionTotalX = s.categories.total ?? null;
    i.subscription = { days: [], latest: s.categories, updatedAtLabel: s.updatedAtLabel };
  }

  async fetchIpoDetails(slug: string): Promise<Ipo | null> {
    const now = this.now();
    const d = await this.source(detailsUrl(slug), "details", (h) => parseDetails(h, now));
    if (!d) return null;
    for (const w of d.warnings) this.log.warn(`[ipowatch] ${slug}: ${w}`);
    const i = emptyIpo(slug, d.name ?? slug);
    return { ...i, board: d.board, dates: d.dates, priceBand: d.priceBand, issueSizeCr: d.issueSizeCr, freshIssueCr: d.freshIssueCr,
      offerForSale: d.offerForSale, lotSize: d.lotSize, listingExchange: d.listingExchange };
  }

  async fetchGmp(slug: string): Promise<GmpData | null> {
    const now = this.now();
    return this.source(gmpUrl(slug), "gmp", (h) => parseGmpPage(h, now));
  }

  async fetchSubscription(slug: string): Promise<SubscriptionData | null> {
    return this.source(subscriptionUrl(slug), "subscription", (h) => parseSubscriptionPage(h));
  }
}
