import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDetails } from "./details-parser.ts";
import { parseGmpPage } from "./gmp-parser.ts";
import { parseGmpListing, parseSubscriptionOverview, parseUpcomingListing } from "./listing-parser.ts";
import { normalizeCategory, parseSubscriptionPage } from "./subscription-parser.ts";
import { slugFromHref, detailsUrl, gmpUrl, subscriptionUrl } from "./urls.ts";
import * as F from "./fixtures.ts";

const now = new Date("2026-10-05T10:00:00Z");

test("GMP listing: rows, status, placeholders, duplicates, foreign hosts", () => {
  const rows = parseGmpListing(F.gmpListingHtml(), now);
  assert.deepEqual(rows.map((r) => r.slug).sort(), ["acme-widgets-ipo", "flat-metals-ipo", "zenith-foods-ipo"]);
  const acme = rows.find((r) => r.slug === "acme-widgets-ipo")!;
  assert.equal(acme.name, "Acme Widgets");
  assert.equal(acme.statusLabel, "Open");
  assert.equal(acme.gmp, 25, "duplicate slug: last row wins, no duplicate record");
  assert.equal(acme.priceMax, 220);
  assert.equal(acme.providerPct, 11.36);
  assert.deepEqual(acme.dates, { open: "2026-09-30", close: "2026-10-05" });
  const zenith = rows.find((r) => r.slug === "zenith-foods-ipo")!;
  assert.equal(zenith.gmp, null, "₹- is unknown, not zero");
  assert.equal(zenith.priceMax, null);
  assert.equal(rows.find((r) => r.slug === "flat-metals-ipo")!.gmp, 0, "₹0 is a real zero");
});

test("upcoming listing: dates, size in crores, band, placeholders", () => {
  const rows = parseUpcomingListing(F.upcomingHtml(), now);
  assert.equal(rows.length, 3);
  const acme = rows[0];
  assert.deepEqual(acme.priceBand, { min: 208, max: 220 });
  assert.equal(acme.issueSizeCr, 178);
  assert.deepEqual(acme.dates, { open: "2026-09-30", close: "2026-10-05" });
  const tba = rows.find((r) => r.slug === "tba-corp-ipo")!;
  assert.deepEqual(tba.dates, { open: null, close: null });
  assert.equal(tba.issueSizeCr, null);
  assert.deepEqual(tba.priceBand, { min: null, max: null });
});

test("subscription overview keeps raw multiples and nulls placeholders", () => {
  const rows = parseSubscriptionOverview(F.subscriptionOverviewHtml(), now);
  const acme = rows.find((r) => r.slug === "acme-widgets-ipo")!;
  assert.equal(acme.board, "SME");
  assert.equal(acme.closeDate, "2026-10-05");
  assert.deepEqual(acme.categories, { qib: 14.11, nii: 0.62, retail: 0.01, total: 0.4 });
  assert.equal(acme.updatedAtLabel, "17:37");
  const z = rows.find((r) => r.slug === "zenith-foods-ipo")!;
  assert.deepEqual(z.categories, { qib: null, nii: null, retail: null, total: null });
  assert.equal(z.board, "MAINBOARD");
});

test("details: full page", () => {
  const d = parseDetails(F.detailsHtml(), now);
  assert.equal(d.name, "Acme Widgets");
  assert.deepEqual(d.dates, { open: "2026-09-30", close: "2026-10-05", allotment: "2026-10-06", refund: "2026-10-07", demat: "2026-10-07", listing: "2026-10-08" });
  assert.deepEqual(d.priceBand, { min: 208, max: 220 });
  assert.equal(d.issueSizeCr, 178);
  assert.equal(d.freshIssueCr, 145);
  assert.deepEqual(d.offerForSale, { raw: "Approx 15,00,000 Equity Shares", cr: null }, "shares are not converted to crores");
  assert.equal(d.lotSize, 68);
  assert.equal(d.listingExchange, "NSE SME");
  assert.equal(d.board, "SME");
  assert.deepEqual(d.warnings, []);
});

test("details: SME retail minimum is 2 lots, so lot size = shares / lots", () => {
  assert.equal(parseDetails(F.detailsHtml({ smeLot: true }), now).lotSize, 1600);
});

test("details: missing optional fields, missing lot table, malformed dates, unexpected HTML", () => {
  const sparse = parseDetails(F.detailsHtml({ omitOfs: true, omitLot: true }), now);
  assert.equal(sparse.offerForSale, null);
  assert.equal(sparse.lotSize, null);
  assert.ok(sparse.warnings.some((w) => w.includes("lot size")));

  const bad = parseDetails(F.detailsHtml({ badDates: true }), now);
  assert.equal(bad.dates.open, null);
  assert.equal(bad.dates.close, null);
  assert.equal(bad.dates.listing, null, "timeline table absent");
  assert.ok(bad.warnings.some((w) => w.includes("open/close")));

  const none = parseDetails(F.detailsHtml({ noTables: true }), now);
  assert.equal(none.priceBand.max, null);
  assert.ok(none.warnings.some((w) => w.includes("no label/value tables")));
  assert.equal(parseDetails("<<not html", now).dates.open, null, "garbage never throws");
});

test("GMP page: history newest-first with IST timestamps; placeholder rows skipped", () => {
  const g = parseGmpPage(F.gmpPageHtml(), now);
  assert.equal(g.history.length, 3, "₹- row skipped, not zero");
  assert.equal(g.history[0].observedAt, "2026-10-05T08:20:00.000Z");
  assert.equal(g.history[0].gmp, 20);
  assert.equal(g.history[0].providerPct, 9.09);
  assert.equal(g.history[0].source, "IPO Watch");
  assert.deepEqual(g.current, { value: 20, providerPct: 9.09, updatedAt: "2026-10-05T08:20:00.000Z", source: "IPO Watch" });
});

test("GMP page: missing table gives no GMP; malformed rows are dropped; real zero kept", () => {
  assert.deepEqual(parseGmpPage(F.gmpPageHtml("empty"), now), { current: null, history: [] });
  const bad = parseGmpPage(F.gmpPageHtml("bad"), now);
  assert.equal(bad.history.length, 1, "bad number, impossible date and ₹- rows dropped");
  assert.equal(bad.history[0].gmp, 0);
  assert.equal(bad.current?.value, 0);
});

test("subscription page: day-wise, retail labelled RII", () => {
  const s = parseSubscriptionPage(F.subscriptionPageHtml("retail"))!;
  assert.deepEqual(s.days.map((d) => d.label), ["Day 1", "Day 2", "Day 3"]);
  assert.deepEqual(s.days[0].categories, { qib: 1, nii: 0.01, retail: 0.06, total: 0.06 });
  assert.deepEqual(s.latest, { qib: 1.33, nii: 1.89, retail: 1.75, total: 1.79 });
});

test("subscription page: all categories are kept, optional ones may be absent per IPO", () => {
  const s = parseSubscriptionPage(F.subscriptionPageHtml("full"))!;
  assert.deepEqual(Object.keys(s.latest).sort(), ["bnii", "employee", "nii", "others", "qib", "retail", "shareholder", "snii", "total"]);
  assert.equal(s.days[0].categories.employee, null);
  assert.equal(s.days[2].categories.others, 0, "0.00 is a real reading");
  assert.equal(parseSubscriptionPage(F.subscriptionPageHtml("none")), null, "no table gives null, not an error");
});

test("subscription page: malformed numbers become null; 12.34x stays 12.34", () => {
  const s = parseSubscriptionPage(F.subscriptionPageHtml("bad"))!;
  assert.equal(s.days[0].categories.qib, 12.34);
  assert.equal(s.days[1].categories.qib, null);
  assert.equal(s.days[0].categories.total, null);
  assert.equal(s.days[1].categories.total, 0);
  assert.equal(normalizeCategory("Retail (X)"), "retail");
  assert.equal(normalizeCategory("Qualified Institutional Buyers"), "qib");
  assert.equal(normalizeCategory("Brand New Cat"), "brand-new-cat");
  assert.equal(normalizeCategory("Emp"), "employee");
});

test("URL resolver validates slugs", () => {
  assert.equal(slugFromHref("https://ipowatch.in/acme-widgets-ipo/"), "acme-widgets-ipo");
  assert.equal(slugFromHref("/acme-widgets-ipo/"), "acme-widgets-ipo");
  assert.equal(slugFromHref("https://evil.example/acme-widgets-ipo/"), null);
  assert.equal(slugFromHref("https://ipowatch.in/upcoming-ipo-list/"), null, "listing pages are not IPO slugs");
  assert.equal(slugFromHref("https://ipowatch.in/a/b-ipo/"), null);
  assert.equal(detailsUrl("acme-widgets-ipo"), "https://ipowatch.in/acme-widgets-ipo/");
  assert.equal(gmpUrl("acme-widgets-ipo"), "https://ipowatch.in/acme-widgets-ipo-gmp-grey-market-premium/");
  assert.equal(subscriptionUrl("acme-widgets-ipo"), "https://ipowatch.in/acme-widgets-ipo-subscription-status/");
  assert.throws(() => detailsUrl("../etc/passwd"));
});
