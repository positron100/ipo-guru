import type { GmpData } from "../types.ts";
import { parseDate, parseNumber, istToIso } from "./parse-util.ts";
import { colIndex, hasHeaders, readTables } from "./tables.ts";

export const GMP_SOURCE = "IPO Watch";

/**
 * Per-IPO GMP page: table "Date | IPO GMP | GMP Trend | Gain | Last Updated", newest first.
 * Rows whose GMP is a placeholder ("₹-") mean "no reading" and are skipped, never turned into zero.
 * A genuine "₹0" is kept.
 */
export function parseGmpPage(html: string, now: Date = new Date()): GmpData {
  for (const t of readTables(html)) {
    if (!hasHeaders(t, "date", "gmp")) continue;
    const dateI = colIndex(t, "date"), gmpI = colIndex(t, "gmp"), gainI = colIndex(t, "gain"), updI = colIndex(t, "updated");
    const history: GmpData["history"] = [];
    for (const r of t.rows) {
      const date = parseDate(r.cells[dateI], now);
      const gmp = parseNumber(r.cells[gmpI]);
      if (!date || gmp === null) continue;
      const observedAt = istToIso(date, updI >= 0 ? r.cells[updI] : null);
      if (!observedAt) continue;
      history.push({ observedAt, gmp, providerPct: parseNumber(gainI >= 0 ? r.cells[gainI] : null), source: GMP_SOURCE });
    }
    history.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    const latest = history[0];
    return {
      history,
      current: latest ? { value: latest.gmp, providerPct: latest.providerPct, updatedAt: latest.observedAt, source: GMP_SOURCE } : null,
    };
  }
  return { current: null, history: [] };
}
