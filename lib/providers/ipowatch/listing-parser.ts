import type { Board } from "../../types";
import { clean, parseBand, parseCrores, parseDateRange, parseDate, parseNumber } from "./parse-util.ts";
import { colIndex, hasHeaders, readTables } from "./tables.ts";
import { slugFromHref } from "./urls.ts";

export interface GmpListingRow {
  slug: string;
  name: string;
  /** "Upcoming" | "Open" | "Closed" ... as written next to the company name. */
  statusLabel: string | null;
  gmp: number | null;
  priceMax: number | null;
  providerPct: number | null;
  dates: { open: string | null; close: string | null };
}
export interface UpcomingRow {
  slug: string;
  name: string;
  dates: { open: string | null; close: string | null };
  issueSizeCr: number | null;
  priceBand: { min: number | null; max: number | null };
}
export interface SubscriptionOverviewRow {
  slug: string;
  name: string;
  board: Board | null;
  closeDate: string | null;
  categories: Record<string, number | null>;
  /** IPO Watch's own "last updated" text, e.g. "17:37" (IST). */
  updatedAtLabel: string | null;
}

const at = (cells: string[], i: number): string | null => (i >= 0 && i < cells.length ? cells[i] : null);

/** "Live GMP" page: tables with Company / GMP / Price Band / Est. Gain / Date. */
export function parseGmpListing(html: string, now: Date = new Date()): GmpListingRow[] {
  const rows = new Map<string, GmpListingRow>();
  for (const t of readTables(html)) {
    if (!hasHeaders(t, "company", "gmp")) continue;
    const gmpI = colIndex(t, "gmp"), bandI = colIndex(t, "price"), gainI = colIndex(t, "gain"), dateI = colIndex(t, "date");
    for (const r of t.rows) {
      const slug = slugFromHref(r.links[0]);
      if (!slug || !r.cells[0]) continue;
      const status = r.spans[0];
      const name = clean(status ? r.cells[0].replace(status, "") : r.cells[0]);
      const gain = at(r.cells, gainI) ?? "";
      const pctMatch = gain.match(/\(([^)]*)\)/);
      rows.set(slug, {
        slug, name, statusLabel: status,
        gmp: parseNumber(at(r.cells, gmpI)),
        priceMax: parseBand(at(r.cells, bandI)).max,
        providerPct: parseNumber(pctMatch?.[1]),
        dates: parseDateRange(at(r.cells, dateI), now),
      });
    }
  }
  return [...rows.values()];
}

/** "Upcoming IPO list": tables with Company / IPO Date / IPO Size / Price Band. */
export function parseUpcomingListing(html: string, now: Date = new Date()): UpcomingRow[] {
  const rows = new Map<string, UpcomingRow>();
  for (const t of readTables(html)) {
    if (!hasHeaders(t, "company", "date", "band")) continue;
    const dateI = colIndex(t, "date"), sizeI = colIndex(t, "size"), bandI = colIndex(t, "band");
    for (const r of t.rows) {
      const slug = slugFromHref(r.links[0]);
      if (!slug || !r.cells[0]) continue;
      rows.set(slug, {
        slug, name: r.cells[0],
        dates: parseDateRange(at(r.cells, dateI), now),
        issueSizeCr: parseCrores(at(r.cells, sizeI)),
        priceBand: parseBand(at(r.cells, bandI)),
      });
    }
  }
  return [...rows.values()];
}

/** "Subscription status today": one row per IPO with QIB / NII / Retail / Total multiples. */
export function parseSubscriptionOverview(html: string, now: Date = new Date()): SubscriptionOverviewRow[] {
  const rows = new Map<string, SubscriptionOverviewRow>();
  for (const t of readTables(html)) {
    if (!hasHeaders(t, "ipo", "qib", "total")) continue;
    const typeI = colIndex(t, "type"), closeI = colIndex(t, "closing"), updI = colIndex(t, "updated");
    const cat = (key: string, ...frag: string[]) => [key, colIndex(t, ...frag)] as const;
    const catCols = [cat("qib", "qib"), cat("nii", "nii"), cat("retail", "retail"), cat("total", "total")].filter(([, i]) => i >= 0);
    for (const r of t.rows) {
      const slug = slugFromHref(r.links[0]);
      if (!slug || !r.cells[0]) continue;
      const type = (at(r.cells, typeI) ?? "").toLowerCase();
      rows.set(slug, {
        slug, name: r.cells[0],
        board: type.includes("sme") ? "SME" : type.includes("main") ? "MAINBOARD" : null,
        closeDate: parseDate(at(r.cells, closeI), now),
        categories: Object.fromEntries(catCols.map(([k, i]) => [k, parseNumber(r.cells[i])])),
        updatedAtLabel: at(r.cells, updI) || null,
      });
    }
  }
  return [...rows.values()];
}
