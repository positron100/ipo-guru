import { test } from "node:test";
import assert from "node:assert/strict";
import { IpoService, mergeIpo } from "./ipo-service.ts";
import type { GmpData, IpoDataProvider, ProviderCapabilities } from "./providers/types.ts";
import { ProviderError } from "./providers/types.ts";
import type { Ipo } from "./types.ts";

const quiet = { warn() {} };
const ipo = (slug: string, over: Partial<Ipo> = {}): Ipo => ({
  slug, name: slug, board: null, status: "open", priceBand: { min: 90, max: 100 }, issueSizeCr: 50, freshIssueCr: null, offerForSale: null,
  lotSize: 100, listingExchange: null,
  dates: { open: "2026-10-01", close: "2026-10-30", allotment: null, refund: null, demat: null, listing: null },
  gmp: { value: 10, providerPct: 10, updatedAt: null }, listing: { issuePrice: null, listingPrice: null, gainPct: null }, subscriptionTotalX: null, ...over,
});

class Stub implements IpoDataProvider {
  readonly name = "Stub";
  readonly url = "https://stub.example";
  capabilities: ProviderCapabilities;
  calls: string[] = [];
  list: Ipo[];
  failOn = new Set<string>();
  constructor(list: Ipo[], caps: ProviderCapabilities = { details: true, gmpHistory: true, subscription: true }) {
    this.list = list;
    this.capabilities = caps;
  }
  async fetchUpcomingIpos() {
    this.calls.push("list");
    if (this.failOn.has("list")) throw new ProviderError("unavailable", "down");
    return { ipos: this.list, fetchedAt: "2026-10-05T00:00:00.000Z" };
  }
  async fetchIpoDetails(slug: string) {
    this.calls.push(`details:${slug}`);
    if (this.failOn.has(`details:${slug}`)) throw new Error("boom");
    return ipo(slug, { lotSize: 68, freshIssueCr: 10 });
  }
  async fetchGmp(slug: string): Promise<GmpData | null> {
    this.calls.push(`gmp:${slug}`);
    if (this.failOn.has(`gmp:${slug}`)) throw new Error("boom");
    const p = { observedAt: "2026-10-05T08:20:00.000Z", gmp: 12, providerPct: 12 };
    return { current: { value: 12, providerPct: 12, updatedAt: p.observedAt }, history: [p] };
  }
  async fetchSubscription(slug: string) {
    this.calls.push(`sub:${slug}`);
    return { days: [], latest: { total: 2.5 }, updatedAtLabel: null };
  }
}

test("list: successful sync returns validated, de-duplicated IPOs (last record per slug wins)", async () => {
  const s = new IpoService(new Stub([ipo("a-ipo"), ipo("b-ipo"), ipo("a-ipo", { name: "A updated" })]), quiet);
  const { ipos } = await s.list();
  assert.deepEqual(ipos.map((i) => i.slug), ["a-ipo", "b-ipo"]);
  assert.equal(ipos[0].name, "A updated", "update instead of duplicate");
});

test("list: invalid values are nulled (not zeroed) and never abort the sync", async () => {
  const bad = ipo("bad-ipo", {
    priceBand: { min: 100, max: 50 }, lotSize: -5,
    dates: { open: "2026-02-31", close: null, allotment: null, refund: null, demat: null, listing: null },
  });
  const { ipos } = await new IpoService(new Stub([bad, ipo("ok-ipo")]), quiet).list();
  assert.equal(ipos.length, 2);
  const b = ipos.find((i) => i.slug === "bad-ipo")!;
  assert.deepEqual(b.priceBand, { min: null, max: null });
  assert.equal(b.lotSize, null);
  assert.equal(b.dates.open, null);
});

test("list: provider failure propagates as a ProviderError (the UI shows its degraded state)", async () => {
  const p = new Stub([ipo("a-ipo")]);
  p.failOn.add("list");
  await assert.rejects(new IpoService(p, quiet).list(), ProviderError);
});

test("detail: merges details, GMP history and subscription", async () => {
  const s = new IpoService(new Stub([ipo("a-ipo")]), quiet);
  const d = (await s.getDetail("a-ipo"))!;
  assert.equal(d.ipo.lotSize, 68);
  assert.equal(d.ipo.freshIssueCr, 10);
  assert.equal(d.ipo.history?.length, 1);
  assert.equal(d.ipo.gmp?.value, 12);
  assert.equal(d.ipo.gmp?.updatedAt, "2026-10-05T08:20:00.000Z");
  assert.equal(d.ipo.subscription?.latest.total, 2.5);
});

test("detail: partial failure still returns the IPO with what succeeded; other IPOs are unaffected", async () => {
  const p = new Stub([ipo("a-ipo"), ipo("b-ipo")]);
  p.failOn.add("details:a-ipo");
  p.failOn.add("gmp:a-ipo");
  const s = new IpoService(p, quiet);
  const a = (await s.getDetail("a-ipo"))!;
  assert.equal(a.ipo.slug, "a-ipo");
  assert.equal(a.ipo.history, undefined);
  assert.equal(a.ipo.subscription?.latest.total, 2.5, "subscription still merged");
  const b = (await s.getDetail("b-ipo"))!;
  assert.equal(b.ipo.history?.length, 1, "b is unaffected by a's failures");
});

test("detail: unknown slug -> null", async () => {
  assert.equal(await new IpoService(new Stub([ipo("a-ipo")]), quiet).getDetail("nope-ipo"), null);
});

test("provider swap: a provider without optional capabilities is never asked for them", async () => {
  const p = new Stub([ipo("a-ipo")], { details: false, gmpHistory: false, subscription: false });
  const s = new IpoService(p, quiet);
  await s.getDetail("a-ipo");
  assert.deepEqual(p.calls, ["list"], "only the collection call; no per-IPO requests");
  assert.deepEqual(s.source, { name: "Stub", url: "https://stub.example", enriched: false });
});

test("mergeIpo: nulls never erase known data; dates/status are recomputed", () => {
  const base = ipo("a-ipo", { lotSize: 100 });
  const extra = ipo("a-ipo", {
    lotSize: null, issueSizeCr: null,
    dates: { open: null, close: null, allotment: "2026-11-02", refund: null, demat: null, listing: null },
  });
  const m = mergeIpo(base, extra);
  assert.equal(m.lotSize, 100);
  assert.equal(m.issueSizeCr, 50);
  assert.equal(m.dates.allotment, "2026-11-02");
  assert.equal(m.dates.open, "2026-10-01");
});
