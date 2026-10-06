import type { SubscriptionData, SubscriptionDay } from "../../types";
import { clean, parseNumber } from "./parse-util.ts";
import { readTables } from "./tables.ts";

/** Map IPO Watch's labels onto stable keys. Unknown labels are slugified, never dropped. */
export function normalizeCategory(label: string): string {
  const t = clean(label).toLowerCase().replace(/\(.*?\)/g, "").replace(/\s*\bx\b\s*$/, "").trim();
  const compact = t.replace(/[\s._-]+/g, "");
  if (compact === "qib" || compact === "qibs" || compact.startsWith("qualifiedinstitution")) return "qib";
  if (compact === "bnii" || compact === "bhni") return "bnii";
  if (compact === "snii" || compact === "shni") return "snii";
  if (compact === "nii" || compact === "hni" || compact.startsWith("noninstitution")) return "nii";
  if (compact === "rii" || compact === "retail" || compact.startsWith("retailindividual")) return "retail";
  if (compact === "employee" || compact === "employees" || compact === "emp" || compact === "empl") return "employee";
  if (compact === "shareholder" || compact === "shareholders") return "shareholder";
  if (compact === "anchor") return "anchor";
  if (compact === "total") return "total";
  if (compact === "others" || compact === "other") return "others";
  return t.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

/**
 * Per-IPO subscription page: "Category | Day 1 | Day 2 | Day 3" with one row per category.
 * Categories vary per IPO (some have employee/shareholder/bNII/sNII rows); each row is kept under its normalized key.
 * Values are "times subscribed" exactly as published (14.11 = 14.11x); placeholders become null.
 */
export function parseSubscriptionPage(html: string): SubscriptionData | null {
  for (const t of readTables(html)) {
    if (!t.headers[0]?.includes("category")) continue;
    const dayCols = t.headers
      .map((h, i) => ({ i, m: h.match(/^day\s*(\d+)/i) }))
      .filter((x): x is { i: number; m: RegExpMatchArray } => x.m !== null);
    if (dayCols.length === 0 || t.rows.length === 0) continue;

    const days: SubscriptionDay[] = dayCols.map(({ m }) => ({ day: Number(m[1]), label: `Day ${m[1]}`, categories: {} }));
    for (const r of t.rows) {
      const key = normalizeCategory(r.cells[0] ?? "");
      if (!key) continue;
      dayCols.forEach(({ i }, k) => { days[k].categories[key] = parseNumber(r.cells[i]); });
    }
    // Latest = most recent day that has at least one reading.
    const lastWithData = [...days].reverse().find((d) => Object.values(d.categories).some((v) => v !== null));
    return { days, latest: lastWithData ? { ...lastWithData.categories } : {}, updatedAtLabel: null };
  }
  return null;
}
