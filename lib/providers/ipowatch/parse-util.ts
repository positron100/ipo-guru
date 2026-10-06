// Parsing helpers for IPO Watch's human-formatted text. Pure functions, no I/O.

export const clean = (s: string | null | undefined): string =>
  (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

/** Placeholders IPO Watch uses for "no value". */
const NULLISH = /^(n\/?a|na|nil|tba|tbd|not\s+available|not\s+announced|\[\.\]|[-–—−]+\s*%?|₹\s*[-–—−]+\s*%?)$/i;

/**
 * First number in the text, or null. Handles Indian grouping ("₹1,94,480"), "9.09%", "12.34x", "Approx ₹178 Crores".
 * "N/A", "-", "₹-", "—" and blanks give null. A value is never converted between units (12.34x stays 12.34).
 */
export function parseNumber(raw: string | null | undefined): number | null {
  const t = clean(raw).replace(/[−–—]/g, (c) => (c === "−" ? "-" : c));
  if (!t || NULLISH.test(t)) return null;
  const m = t.match(/-?\s?\d[\d,]*(?:\.\d+)?|-?\.\d+/);
  if (!m) return null;
  const n = Number(m[0].replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Number only when the text is expressed in crores ("₹108.35 Cr.", "Approx ₹178 Crores"). Share counts give null. */
export function parseCrores(raw: string | null | undefined): number | null {
  const t = clean(raw);
  return /\bcr(?:ores?|\.)?(?:\b|$)/i.test(t) ? parseNumber(t) : null;
}

/** "₹208 to ₹220 Per Share" -> {min:208,max:220}; one number -> both; unparseable -> nulls. */
export function parseBand(raw: string | null | undefined): { min: number | null; max: number | null } {
  const nums = [...clean(raw).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ""))).filter(Number.isFinite);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const monthNo = (s: string): number | null => MONTHS[s.slice(0, 3).toLowerCase()] ?? null;
const ymd = (y: number, m: number, d: number): string | null => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
};

/** IPO Watch often omits the year: pick the year that puts the date closest to `now`. */
function inferYear(m: number, d: number, now: Date): number | null {
  let best: { y: number; diff: number } | null = null;
  for (const y of [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    if (!ymd(y, m, d)) continue;
    const diff = Math.abs(Date.UTC(y, m - 1, d) - now.getTime());
    if (!best || diff < best.diff) best = { y, diff };
  }
  return best?.y ?? null;
}

/**
 * "September 30, 2026", "October7, 2026" (missing space), "5 Oct 2026", "5 October", "October 5" -> "YYYY-MM-DD".
 * Placeholders, bare years ("2026") and impossible dates give null.
 */
export function parseDate(raw: string | null | undefined, now: Date = new Date()): string | null {
  const t = clean(raw).replace(/\*/g, "");
  if (!t || NULLISH.test(t)) return null;
  const a = t.match(/([A-Za-z]{3,9})\.?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/); // October 7, 2026
  const b = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?/); // 7 October 2026
  let m: number | null = null, d = 0, y: number | null = null;
  if (b && monthNo(b[2])) { m = monthNo(b[2]); d = Number(b[1]); y = b[3] ? Number(b[3]) : null; }
  else if (a && monthNo(a[1])) { m = monthNo(a[1]); d = Number(a[2]); y = a[3] ? Number(a[3]) : null; }
  if (!m) return null;
  const year = y ?? inferYear(m, d, now);
  return year ? ymd(year, m, d) : null;
}

/** "30-5 October", "21-23 Oct*", "30 Sep - 5 Oct", "5-7 Oct 2026" -> open/close. A single date gives open=close. */
export function parseDateRange(raw: string | null | undefined, now: Date = new Date()): { open: string | null; close: string | null } {
  const t = clean(raw).replace(/\*/g, "");
  const r = t.match(/^(\d{1,2})(?:\s*([A-Za-z]{3,9}))?\s*[-–—to]+\s*(\d{1,2})\s*([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?/);
  if (!r) {
    const one = parseDate(t, now);
    return { open: one, close: one };
  }
  const closeM = monthNo(r[4]);
  if (!closeM) return { open: null, close: null };
  const closeD = Number(r[3]);
  const year = r[5] ? Number(r[5]) : inferYear(closeM, closeD, now);
  if (!year) return { open: null, close: null };
  const openD = Number(r[1]);
  const openM = r[2] ? monthNo(r[2]) : openD > closeD ? (closeM === 1 ? 12 : closeM - 1) : closeM;
  if (!openM) return { open: null, close: ymd(year, closeM, closeD) };
  const openY = openM > closeM ? year - 1 : year;
  return { open: ymd(openY, openM, openD), close: ymd(year, closeM, closeD) };
}

/** "13:50" (IST) on a YYYY-MM-DD date -> ISO-8601 UTC. Missing/invalid time gives noon IST (documented: time unknown). */
export function istToIso(date: string, time: string | null | undefined): string | null {
  const m = clean(time).match(/^(\d{1,2}):(\d{2})/);
  const hh = m ? m[1].padStart(2, "0") : "12", mm = m ? m[2] : "00";
  const d = new Date(`${date}T${hh}:${mm}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const now = new Date("2026-10-05T10:00:00Z");
  assert(parseNumber("₹1,94,480") === 194480 && parseNumber("9.09%") === 9.09 && parseNumber("12.34x") === 12.34 && parseNumber("Approx ₹178 Crores") === 178, "numbers");
  for (const x of ["", "-", "–", "—", "₹-", "-%", "N/A", "Not Available", "[.]", "TBA", null, undefined, "abc"]) assert(parseNumber(x as string) === null, `nullish ${String(x)}`);
  assert(parseNumber("0") === 0 && parseNumber("₹0") === 0 && parseNumber("-5") === -5, "zero and negative preserved");
  assert(parseCrores("₹108.35 Cr.") === 108.35 && parseCrores("Approx 15,00,000 Equity Shares") === null, "crores");
  assert(JSON.stringify(parseBand("₹208 to ₹220 Per Share")) === '{"min":208,"max":220}' && parseBand("₹-").max === null && parseBand("₹82").min === 82, "band");
  assert(parseDate("September 30, 2026", now) === "2026-09-30" && parseDate("October7, 2026", now) === "2026-10-07", "dates");
  assert(parseDate("5 October", now) === "2026-10-05" && parseDate("5 Oct 2026", now) === "2026-10-05", "dates 2");
  assert(parseDate("28 December", now) === "2026-12-28" && parseDate("2 January", now) === "2027-01-02", "year inference");
  assert(parseDate("2026", now) === null && parseDate("February 31, 2026", now) === null && parseDate("TBA", now) === null && parseDate("", now) === null, "bad dates");
  const r1 = parseDateRange("30-5 October", now);
  assert(r1.open === "2026-09-30" && r1.close === "2026-10-05", "range across months");
  assert(parseDateRange("21-23 Oct*", now).open === "2026-10-21" && parseDateRange("30 Sep - 5 Oct", now).open === "2026-09-30", "ranges");
  assert(parseDateRange("garbage", now).open === null, "bad range");
  assert(istToIso("2026-10-05", "13:50") === "2026-10-05T08:20:00.000Z", "IST to UTC");
}
