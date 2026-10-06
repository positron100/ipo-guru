import { test } from "node:test";
import assert from "node:assert/strict";
import { IpoWatchProvider } from "./provider.ts";
import type { PageFetcher } from "./provider.ts";
import { ProviderError } from "../types.ts";
import { LISTING_URLS, detailsUrl, gmpUrl, subscriptionUrl } from "./urls.ts";
import * as F from "./fixtures.ts";

const now = () => new Date("2026-10-05T10:00:00Z");
const quiet = { warn() {} };

/** Mock HTTP layer: url -> html | null (404) | Error (failure). Records every request. */
function mock(pages: Record<string, string | null | Error>) {
  const calls: string[] = [];
  const fetcher: PageFetcher = {
    async getHtml(url: string) {
      calls.push(url);
      const v = pages[url];
      if (v instanceof Error) throw v;
      return v === undefined ? null : v;
    },
  };
  return { fetcher, calls };
}
const provider = (pages: Record<string, string | null | Error>) => {
  const m = mock(pages);
  return { p: new IpoWatchProvider(m.fetcher, { logger: quiet, now }), calls: m.calls };
};
const ALL = {
  [LISTING_URLS.gmp]: F.gmpListingHtml(),
  [LISTING_URLS.upcoming]: F.upcomingHtml(),
  [LISTING_URLS.subscription]: F.subscriptionOverviewHtml(),
};

test("list: merges the three listing pages by slug, one record per IPO, using exactly 3 requests", async () => {
  const { p, calls } = provider(ALL);
  const { ipos, fetchedAt } = await p.fetchUpcomingIpos();
  assert.equal(calls.length, 3);
  assert.equal(fetchedAt, "2026-10-05T10:00:00.000Z");
  assert.equal(new Set(ipos.map((i) => i.slug)).size, ipos.length);
  const acme = ipos.find((i) => i.slug === "acme-widgets-ipo")!;
  assert.equal(acme.name, "Acme Widgets");
  assert.deepEqual(acme.priceBand, { min: 208, max: 220 });
  assert.equal(acme.issueSizeCr, 178);
  assert.equal(acme.gmp?.value, 25);
  assert.equal(acme.gmp?.source, "IPO Watch");
  assert.equal(acme.gmp?.updatedAt, null, "listing page has no reading time");
  assert.equal(acme.board, "SME");
  assert.equal(acme.subscriptionTotalX, 0.4);
  assert.equal(acme.status, "open");
  const zenith = ipos.find((i) => i.slug === "zenith-foods-ipo")!;
  assert.equal(zenith.gmp, null, "missing GMP stays null");
  assert.equal(zenith.status, "upcoming");
  assert.equal(zenith.subscriptionTotalX, null);
});

test("list: one failing source does not lose the others", async () => {
  const { p } = provider({ ...ALL, [LISTING_URLS.gmp]: new ProviderError("unavailable", "HTTP 500") });
  const { ipos } = await p.fetchUpcomingIpos();
  const acme = ipos.find((i) => i.slug === "acme-widgets-ipo")!;
  assert.equal(acme.gmp, null);
  assert.equal(acme.issueSizeCr, 178);
});

test("list: all sources failing is a ProviderError (the service layer decides the fallback)", async () => {
  const boom = new Error("403");
  const { p } = provider({ [LISTING_URLS.gmp]: boom, [LISTING_URLS.upcoming]: boom, [LISTING_URLS.subscription]: boom });
  await assert.rejects(p.fetchUpcomingIpos(), (e: unknown) => e instanceof ProviderError && e.kind === "unavailable");
});

test("list: pages that parse to nothing are reported as a structure change", async () => {
  const empty = "<html><body><p>nothing</p></body></html>";
  const { p } = provider({ [LISTING_URLS.gmp]: empty, [LISTING_URLS.upcoming]: empty, [LISTING_URLS.subscription]: empty });
  await assert.rejects(p.fetchUpcomingIpos(), (e: unknown) => e instanceof ProviderError && e.kind === "parse");
});

test("details page -> IPO DTO", async () => {
  const slug = "acme-widgets-ipo";
  const { p } = provider({ [detailsUrl(slug)]: F.detailsHtml() });
  const d = (await p.fetchIpoDetails(slug))!;
  assert.equal(d.slug, slug);
  assert.equal(d.lotSize, 68);
  assert.equal(d.dates.refund, "2026-10-07");
  assert.equal(d.freshIssueCr, 145);
  assert.equal(d.listingExchange, "NSE SME");
  assert.equal(d.board, "SME");
});

test("details: 404 gives null; unexpected HTML gives an IPO with nulls, never a throw", async () => {
  const slug = "acme-widgets-ipo";
  assert.equal(await provider({}).p.fetchIpoDetails(slug), null);
  const d = (await provider({ [detailsUrl(slug)]: F.detailsHtml({ noTables: true }) }).p.fetchIpoDetails(slug))!;
  assert.equal(d.priceBand.max, null);
  assert.equal(d.dates.open, null);
});

test("GMP page -> GMP DTO with history; missing page -> null", async () => {
  const slug = "acme-widgets-ipo";
  const g = (await provider({ [gmpUrl(slug)]: F.gmpPageHtml() }).p.fetchGmp(slug))!;
  assert.equal(g.history.length, 3);
  assert.equal(g.current?.value, 20);
  assert.equal(await provider({}).p.fetchGmp(slug), null);
  const e = (await provider({ [gmpUrl(slug)]: F.gmpPageHtml("empty") }).p.fetchGmp(slug))!;
  assert.equal(e.current, null);
});

test("subscription page -> subscription DTO; failure -> null", async () => {
  const slug = "acme-widgets-ipo";
  const s = (await provider({ [subscriptionUrl(slug)]: F.subscriptionPageHtml("full") }).p.fetchSubscription(slug))!;
  assert.equal(s.days.length, 3);
  assert.equal(s.latest.total, 1.79);
  assert.equal(await provider({ [subscriptionUrl(slug)]: new Error("timeout") }).p.fetchSubscription(slug), null);
});

test("invalid slugs never reach the network", async () => {
  const { p, calls } = provider({});
  await assert.rejects(p.fetchGmp("../x"));
  assert.equal(calls.length, 0);
});
