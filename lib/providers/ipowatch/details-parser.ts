import type { Board } from "../../types";
import { clean, parseBand, parseCrores, parseDate, parseNumber } from "./parse-util.ts";
import { colIndex, h1s, hasHeaders, readTables } from "./tables.ts";

export interface IpoDetailsParsed {
  name: string | null;
  board: Board | null;
  dates: { open: string | null; close: string | null; allotment: string | null; refund: string | null; demat: string | null; listing: string | null };
  priceBand: { min: number | null; max: number | null };
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  offerForSale: { raw: string; cr: number | null } | null;
  lotSize: number | null;
  listingExchange: string | null;
  /** Human-readable notes for anything expected but missing; used for logs, never thrown. */
  warnings: string[];
}

const label = (s: string): string => clean(s).replace(/:$/, "").toLowerCase();
const PLACEHOLDER = /^(?:[-–—]*|\[\.\]|tba|n\/?a)(?:\s+(?:shares|cr\.?))?$/i;

/**
 * Detail pages hold several unclassed two-column tables (issue details, timeline, anchor info...). Collect every
 * label -> value pair from 2-column tables; the first occurrence of a label wins. Locating by label, not position,
 * keeps this working when IPO Watch adds or reorders tables.
 */
function keyValues(html: string): Map<string, string> {
  const kv = new Map<string, string>();
  for (const t of readTables(html)) {
    const grid = [t.headers, ...t.rows.map((r) => r.cells)]; // the "header" row of a label/value table is data too
    if (grid.some((r) => r.length !== 2)) continue;
    for (const [k, v] of grid) {
      const key = label(k);
      if (key && !kv.has(key)) kv.set(key, clean(v));
    }
  }
  return kv;
}

const first = (kv: Map<string, string>, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = kv.get(k);
    if (v !== undefined) return PLACEHOLDER.test(v) ? null : v;
  }
  return null;
};

export function parseDetails(html: string, now: Date = new Date()): IpoDetailsParsed {
  const warnings: string[] = [];
  const kv = keyValues(html);
  if (kv.size === 0) warnings.push("no label/value tables found (page structure may have changed)");

  const dates = {
    open: parseDate(first(kv, "ipo open date"), now),
    close: parseDate(first(kv, "ipo close date"), now),
    allotment: parseDate(first(kv, "basis of allotment", "allotment date"), now),
    refund: parseDate(first(kv, "refunds", "initiation of refunds", "refund date"), now),
    demat: parseDate(first(kv, "credit to demat account", "credit of shares to demat", "demat credit"), now),
    listing: parseDate(first(kv, "ipo listing date", "listing date"), now),
  };
  if (!dates.open && !dates.close) warnings.push("open/close dates missing");

  const ofsRaw = first(kv, "offer for sale");
  const listingText = first(kv, "ipo listing");

  // Lot-size table: Application | Lot Size | Shares | Amount. The first row is the retail minimum, which is
  // 1 lot on the mainboard but 2 lots for most SME issues, so one lot = shares / lots.
  let lotSize: number | null = null;
  for (const t of readTables(html)) {
    if (!hasHeaders(t, "application", "lot size", "shares")) continue;
    const lots = parseNumber(t.rows[0]?.cells[colIndex(t, "lot size")]);
    const shares = parseNumber(t.rows[0]?.cells[colIndex(t, "shares")]);
    if (shares !== null && lots !== null && lots > 0 && shares % lots === 0) lotSize = shares / lots;
    break;
  }
  if (lotSize === null) warnings.push("lot size table missing");

  const title = h1s(html).find((h) => /ipo date/i.test(h)) ?? null;
  return {
    name: title ? clean(title.replace(/\s+IPO Date.*$/i, "")) || null : null,
    board: listingText && /sme/i.test(listingText) ? "SME" : null,
    dates,
    priceBand: parseBand(first(kv, "ipo price band", "price band")),
    issueSizeCr: parseCrores(first(kv, "issue size")),
    freshIssueCr: parseCrores(first(kv, "fresh issue")),
    offerForSale: ofsRaw ? { raw: ofsRaw, cr: parseCrores(ofsRaw) } : null,
    lotSize,
    listingExchange: listingText,
    warnings,
  };
}
