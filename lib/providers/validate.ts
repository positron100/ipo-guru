import type { Ipo, SubscriptionData } from "../types";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const validYmd = (s: string | null): string | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
};
const positive = (v: number | null): number | null => (isNum(v) && v > 0 ? v : null);
const nonNegative = (v: number | null): number | null => (isNum(v) && v >= 0 ? v : null);

function cleanSubscription(s: SubscriptionData | undefined): SubscriptionData | undefined {
  if (!s) return undefined;
  const cats = (c: Record<string, number | null>) =>
    Object.fromEntries(Object.entries(c).map(([k, v]) => [k, nonNegative(v)]));
  return { ...s, latest: cats(s.latest), days: s.days.map((d) => ({ ...d, categories: cats(d.categories) })) };
}

/**
 * Drop implausible values (to null, never to 0) instead of failing the whole record.
 * Returns the cleaned IPO plus human-readable warnings for logging.
 */
export function validateIpo(ipo: Ipo): { ipo: Ipo; warnings: string[] } {
  const warnings: string[] = [];
  const note = (m: string) => warnings.push(`${ipo.slug}: ${m}`);

  const dates = {
    open: validYmd(ipo.dates.open), close: validYmd(ipo.dates.close), allotment: validYmd(ipo.dates.allotment),
    refund: validYmd(ipo.dates.refund), demat: validYmd(ipo.dates.demat), listing: validYmd(ipo.dates.listing),
  };
  for (const k of Object.keys(dates) as (keyof typeof dates)[]) if (ipo.dates[k] && !dates[k]) note(`invalid ${k} date "${ipo.dates[k]}"`);
  if (dates.open && dates.close && dates.open > dates.close) {
    note(`open ${dates.open} after close ${dates.close}; dropping both`);
    dates.open = null; dates.close = null;
  }

  let { min, max } = ipo.priceBand;
  min = positive(min); max = positive(max);
  if (min !== null && max !== null && min > max) { note(`price band ${min}-${max} inverted; dropping`); min = null; max = null; }

  const lot = positive(ipo.lotSize);
  if (ipo.lotSize !== null && (lot === null || !Number.isInteger(lot))) note(`invalid lot size ${ipo.lotSize}`);

  const issue = positive(ipo.issueSizeCr);
  if (ipo.issueSizeCr !== null && issue === null) note(`invalid issue size ${ipo.issueSizeCr}`);

  let gmp = ipo.gmp;
  if (gmp && !isNum(gmp.value)) { note("invalid GMP value"); gmp = null; }

  const history = ipo.history?.filter((p) => isNum(p.gmp) && !Number.isNaN(Date.parse(p.observedAt)));
  const cleaned: Ipo = {
    ...ipo,
    dates,
    priceBand: { min, max },
    lotSize: lot !== null && Number.isInteger(lot) ? lot : null,
    issueSizeCr: issue,
    freshIssueCr: positive(ipo.freshIssueCr),
    gmp,
    subscriptionTotalX: nonNegative(ipo.subscriptionTotalX),
    subscription: cleanSubscription(ipo.subscription),
    history,
  };
  return { ipo: cleaned, warnings };
}

export function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const base: Ipo = {
    slug: "x-ipo", name: "X", board: null, status: "open", priceBand: { min: 100, max: 90 }, issueSizeCr: -1, freshIssueCr: null,
    offerForSale: null, lotSize: 10.5, listingExchange: null,
    dates: { open: "2026-10-09", close: "2026-10-05", allotment: "2026-13-40", refund: null, demat: null, listing: null },
    gmp: { value: Number.NaN, providerPct: null, updatedAt: null }, listing: { issuePrice: null, listingPrice: null, gainPct: null },
    subscriptionTotalX: -3,
  };
  const { ipo, warnings } = validateIpo(base);
  assert(ipo.priceBand.min === null && ipo.priceBand.max === null, "inverted band dropped");
  assert(ipo.dates.open === null && ipo.dates.close === null && ipo.dates.allotment === null, "bad dates dropped");
  assert(ipo.lotSize === null && ipo.issueSizeCr === null && ipo.gmp === null && ipo.subscriptionTotalX === null, "bad numbers dropped");
  assert(warnings.length >= 5, "warnings recorded");
  const ok = validateIpo({ ...base, priceBand: { min: 90, max: 100 }, lotSize: 100, issueSizeCr: 50, dates: { ...base.dates, open: "2026-10-01", close: "2026-10-05", allotment: null }, gmp: { value: 0, providerPct: 0, updatedAt: null }, subscriptionTotalX: 0 });
  assert(ok.ipo.gmp?.value === 0 && ok.ipo.subscriptionTotalX === 0 && ok.ipo.priceBand.max === 100 && ok.warnings.length === 0, "valid zero values preserved");
}
