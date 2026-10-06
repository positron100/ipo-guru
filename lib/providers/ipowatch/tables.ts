import * as cheerio from "cheerio";
import { clean } from "./parse-util.ts";

export interface TableRow {
  cells: string[];
  /** First link href in each cell (or null). */
  links: (string | null)[];
  /** Text of the first <span> in each cell (IPO Watch puts the status "Open/Closed/Upcoming" there). */
  spans: (string | null)[];
}
export interface Table {
  /** Lower-cased, whitespace-normalised header cells. */
  headers: string[];
  rows: TableRow[];
}

/**
 * Read every <table> in the page. IPO Watch's tables carry no stable ids/classes (and their order shifts between
 * pages), so callers locate tables by header text, not by CSS selector or index.
 */
export function readTables(html: string): Table[] {
  const $ = cheerio.load(html);
  const out: Table[] = [];
  $("table").each((_, t) => {
    const trs = $(t).find("tr").toArray();
    if (trs.length === 0) return;
    const cellsOf = (tr: (typeof trs)[number]) => $(tr).children("th,td").toArray();
    const headerRow = $(t).find("thead tr").first().get(0) ?? trs[0];
    const headers = cellsOf(headerRow).map((c) => clean($(c).text()).toLowerCase());
    const bodyRows = trs.filter((tr) => tr !== headerRow);
    const rows: TableRow[] = bodyRows.map((tr) => {
      const cs = cellsOf(tr);
      return {
        cells: cs.map((c) => clean($(c).text())),
        links: cs.map((c) => $(c).find("a[href]").first().attr("href") ?? null),
        spans: cs.map((c) => { const s = clean($(c).find("span").first().text()); return s || null; }),
      };
    });
    out.push({ headers, rows });
  });
  return out;
}

/** Index of the first header containing every fragment (case-insensitive), or -1. */
export const colIndex = (t: Table, ...fragments: string[]): number =>
  t.headers.findIndex((h) => fragments.every((f) => h.includes(f.toLowerCase())));

export const hasHeaders = (t: Table, ...fragments: string[]): boolean =>
  fragments.every((f) => t.headers.some((h) => h.includes(f.toLowerCase())));

/** The page's <h1> texts (IPO Watch pages can contain more than one). */
export function h1s(html: string): string[] {
  const $ = cheerio.load(html);
  return $("h1").toArray().map((h) => clean($(h).text())).filter(Boolean);
}
