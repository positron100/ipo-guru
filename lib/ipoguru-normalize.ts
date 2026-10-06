import type { Board, GmpSnapshot, Ipo, IpoStatus } from "./types";

type Raw = Record<string, unknown>;
export const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

/** IPO Guru sends money/percent as strings ("35", "29.17%"). Unparseable or empty -> null; "0" -> 0. */
export function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.replace(/[,%₹\s]/g, "");
  if (t === "") return null;
  const x = Number(t);
  return Number.isFinite(x) ? x : null;
}
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const ymd = (v: unknown): string | null => {
  const s = str(v)?.slice(0, 10) ?? null;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const isoTs = (v: unknown): string | null => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? s : null;
};

export const istToday = (now = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);

/** The calendar is cached for hours, so derive the stage from IST dates; fall back to the provider's status. */
export function resolveStatus(
  provider: IpoStatus | null,
  isListed: boolean,
  d: Ipo["dates"],
  today: string,
): IpoStatus {
  if (isListed || (d.listing && today > d.listing)) return "listed";
  if (d.close && today > d.close) return "closed";
  if (d.open && d.close && today >= d.open && today <= d.close) return "open";
  if (d.open && today < d.open) return "upcoming";
  return provider ?? "upcoming";
}

const PROVIDER_STATUS: Record<string, IpoStatus> = { upcoming: "upcoming", open: "open", closed: "closed", listed: "listed" };

export function normalizeGmp(g: unknown): GmpSnapshot | null {
  if (!isObj(g)) return null;
  const value = num(g.price_value) ?? num(g.price);
  if (value === null) return null;
  return { value, providerPct: num(g.percentage), updatedAt: isoTs(g.updated_at), source: "IPO Guru" };
}

export function normalizeIpo(r: unknown, today = istToday()): Ipo | null {
  if (!isObj(r)) return null;
  const slug = str(r.slug), name = str(r.name);
  if (!slug || !name) return null;
  const type = str(r.type) ?? "";
  const board: Board | null = /sme/i.test(type) ? "SME" : /main/i.test(type) ? "MAINBOARD" : null;
  const dates = { open: ymd(r.open_date), close: ymd(r.close_date), allotment: ymd(r.allotment_date), refund: null, demat: null, listing: ymd(r.listing_date) };
  let min = num(r.price_min), max = num(r.price_max);
  if (min === null && max === null) {
    const m = str(r.price_band)?.match(/^\s*([\d.]+)\s*-\s*([\d.]+)\s*$/);
    if (m) { min = Number(m[1]); max = Number(m[2]); }
  }
  const status = resolveStatus(PROVIDER_STATUS[(str(r.status) ?? "").toLowerCase()] ?? null, r.is_listed === true, dates, today);
  return {
    slug, name, board, status,
    priceBand: { min, max },
    issueSizeCr: num(r.issue_size),
    freshIssueCr: null,
    offerForSale: null,
    lotSize: num(r.lot_size),
    listingExchange: null,
    dates,
    gmp: normalizeGmp(r.gmp),
    listing: { issuePrice: num(r.issue_price), listingPrice: num(r.listing_price), gainPct: num(r.listing_gain_percent) },
    subscriptionTotalX: num(r.subscription_total),
  };
}

/** Apply GET /gmp rows over the GMP block embedded in GET /ipos. A slug present in /gmp wins, even if its GMP is null. */
export function mergeGmp(ipos: Ipo[], gmpRows: unknown[]): Ipo[] {
  const bySlug = new Map<string, GmpSnapshot | null>();
  for (const row of gmpRows) if (isObj(row) && str(row.slug)) bySlug.set(str(row.slug)!, normalizeGmp(row.gmp));
  return ipos.map((i) => (bySlug.has(i.slug) ? { ...i, gmp: bySlug.get(i.slug)! } : i));
}

export function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  assert(num("0") === 0 && num("35") === 35 && num("29.17%") === 29.17 && num("") === null && num(null) === null && num("x") === null, "num");
  const row = {
    slug: "example-ipo", name: "Example Ltd", type: "SME", status: "Open", is_listed: false,
    open_date: "2026-10-05", close_date: "2026-10-07", listing_date: "2026-10-12",
    price_band: "140-148", price_min: 140, price_max: 148, issue_size: "55.2", lot_size: 1000,
    gmp: { price: "0", percentage: "0.00%", updated_at: "2026-10-05T06:00:00Z" }, subscription_total: "3.5",
  };
  const i = normalizeIpo(row, "2026-10-06")!;
  assert(i.board === "SME" && i.status === "open" && i.gmp?.value === 0 && i.priceBand.max === 148 && i.subscriptionTotalX === 3.5, "map");
  assert(normalizeIpo({ ...row, gmp: { price: null } }, "2026-10-06")!.gmp === null, "null gmp stays null");
  assert(normalizeIpo({ ...row, gmp: null }, "2026-10-06")!.gmp === null, "absent gmp");
  assert(normalizeIpo(row, "2026-10-04")!.status === "upcoming", "upcoming by date");
  assert(normalizeIpo(row, "2026-10-08")!.status === "closed", "closed by date");
  assert(normalizeIpo(row, "2026-10-13")!.status === "listed", "listed by date");
  assert(normalizeIpo({ ...row, is_listed: true }, "2026-10-06")!.status === "listed", "is_listed");
  assert(normalizeIpo({ ...row, open_date: null, close_date: null, listing_date: null }, "2026-10-06")!.status === "open", "provider fallback");
  assert(normalizeIpo({ ...row, price_min: null, price_max: null }, "2026-10-06")!.priceBand.max === 148, "band string fallback");
  assert(normalizeIpo({ name: "x" }) === null, "slug required");
  const merged = mergeGmp([i], [{ slug: "example-ipo", gmp: { price: "12", updated_at: "2026-10-06T01:00:00Z" } }]);
  assert(merged[0].gmp?.value === 12, "gmp override");
  assert(mergeGmp([i], [{ slug: "other", gmp: { price: "5" } }])[0].gmp?.value === 0, "no row keeps embedded");
}
