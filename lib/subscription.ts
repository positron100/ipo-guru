import type { SubscriptionData } from "./types";

/**
 * View model for the subscription section. Pure data shaping: nothing here fetches, and nothing is invented.
 * - Only days that actually carry a reading are kept; a missing Day 3 is never rendered or relabelled.
 * - Categories with no reading on any kept day are dropped.
 * - Total is taken from the provider's `total` row only (a total cannot be derived from category multiples).
 */
export interface SubCategory {
  key: string;
  label: string;
  /** One entry per kept day (null = not reported that day). */
  values: (number | null)[];
  /** Last reported value and the reading before it, for "change since the previous day". */
  latest: number | null;
  prev: number | null;
  /** Label of the day `latest` belongs to. */
  latestDay: string | null;
}

export interface SubModel {
  dayLabels: string[];
  /** Every category except total, in a stable investor-type order. */
  categories: SubCategory[];
  total: SubCategory | null;
  /** At least two days have readings, so a trend can be drawn. */
  hasHistory: boolean;
  updatedAtLabel: string | null;
}

const LABELS: Record<string, string> = {
  qib: "QIB", nii: "NII", bnii: "B-NII", snii: "S-NII", retail: "Retail", employee: "Employee", emp: "Employee",
  shareholder: "Shareholder", anchor: "Anchor", others: "Others", total: "Total",
};
const ORDER = ["qib", "nii", "bnii", "snii", "retail", "employee", "shareholder", "anchor", "others"];

/** Human-readable category name. Known keys map exactly; unknown slugs become Title Case words. */
export function categoryLabel(key: string): string {
  return LABELS[key] ?? key.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const rank = (k: string) => { const i = ORDER.indexOf(k); return i < 0 ? ORDER.length : i; };

export const fmtX = (v: number) => `${v.toFixed(2)}x`;
const has = (v: number | null): v is number => v !== null && Number.isFinite(v);

export function buildSubscription(data: SubscriptionData): SubModel | null {
  let days = data.days
    .filter((d) => Object.values(d.categories).some(has))
    .map((d) => ({ label: d.label, categories: d.categories }));
  // The overview feed has no per-day split: show it as one honest "Latest" column.
  if (days.length === 0 && Object.values(data.latest).some(has)) days = [{ label: "Latest", categories: data.latest }];
  if (days.length === 0) return null;

  const keys = [...new Set(days.flatMap((d) => Object.keys(d.categories)))];
  const build = (key: string): SubCategory | null => {
    const values = days.map((d) => (has(d.categories[key] ?? null) ? (d.categories[key] as number) : null));
    let li = -1;
    values.forEach((v, i) => { if (v !== null) li = i; });
    if (li < 0) return null;
    let pi = -1;
    values.forEach((v, i) => { if (v !== null && i < li) pi = i; });
    return { key, label: categoryLabel(key), values, latest: values[li], prev: pi >= 0 ? values[pi] : null, latestDay: days[li].label };
  };
  const categories = keys
    .filter((k) => k !== "total")
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(build)
    .filter((c): c is SubCategory => c !== null);
  const total = keys.includes("total") ? build("total") : null;
  if (categories.length === 0 && !total) return null;

  return { dayLabels: days.map((d) => d.label), categories, total, hasHistory: days.length >= 2, updatedAtLabel: data.updatedAtLabel };
}

/* ------------------------------------------------------------------ summary cards */

export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** Change versus the previous reported day; null when there is no earlier reading. */
  delta: number | null;
  prevDay: string | null;
  support: string;
}

const NII_KEYS = ["snii", "bnii", "nii"];

/**
 * Up to four cards: Total, Retail, the strongest NII category, QIB. Missing ones are replaced by the next-strongest
 * remaining categories, so a sparse IPO still gets meaningful cards. Nothing is shown for a category that is not reported.
 */
export function pickKpis(m: SubModel, max = 4): Kpi[] {
  const byKey = new Map(m.categories.map((c) => [c.key, c]));
  const nii = NII_KEYS.map((k) => byKey.get(k)).filter((c): c is SubCategory => !!c).sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0))[0];
  const wanted: (SubCategory | null | undefined)[] = [m.total, byKey.get("retail"), nii, byKey.get("qib")];
  const chosen = wanted.filter((c): c is SubCategory => !!c);
  const used = new Set(chosen.map((c) => c.key));
  const rest = m.categories.filter((c) => !used.has(c.key) && c.key !== "anchor").sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0));
  for (const c of rest) { if (chosen.length >= max) break; chosen.push(c); }

  const top = [...m.categories].sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0))[0];
  return chosen.slice(0, max).map((c) => {
    const v = c.latest as number;
    const support =
      c.key === "total" ? (v >= 1 ? "Overall: fully subscribed" : v > 0 ? "Overall issue" : "No bids yet")
      : c === top && m.categories.length > 1 && v > 0 ? "Highest category"
      : v >= 1 ? "Fully subscribed" : v > 0 ? "Partly subscribed" : "No bids yet";
    return { key: c.key, label: c.label, value: v, delta: c.prev !== null ? v - c.prev : null, prevDay: c.prev !== null ? previousDayLabel(m, c) : null, support };
  });
}

function previousDayLabel(m: SubModel, c: SubCategory): string | null {
  const li = c.values.lastIndexOf(c.latest as number);
  for (let i = li - 1; i >= 0; i--) if (c.values[i] !== null) return m.dayLabels[i];
  return null;
}

/* ------------------------------------------------------------------ insight */

export interface Insight {
  tone: "up" | "flat" | "down";
  title: string;
  lines: string[];
}

/**
 * Plain-language reading of the numbers. Deterministic and descriptive only: it never predicts a listing, recommends
 * anything, or implies a guarantee.
 */
export function buildInsight(m: SubModel): Insight {
  const lines: string[] = [];
  const ranked = [...m.categories].filter((c) => has(c.latest)).sort((a, b) => (b.latest as number) - (a.latest as number));

  // Direction of the overall trend, from the total when reported, otherwise the strongest category.
  const lead = m.total ?? ranked[0] ?? null;
  const vals = lead ? lead.values.filter(has) : [];
  let tone: Insight["tone"] = "flat";
  let title = "Subscription so far";
  if (vals.length >= 2) {
    const last = vals[vals.length - 1], prev = vals[vals.length - 2];
    if (last > prev) {
      tone = "up";
      const before = vals.length >= 3 ? prev - vals[vals.length - 3] : null;
      title = before !== null && last - prev > before ? "Accelerating demand" : "Growing demand";
    } else if (last < prev) { tone = "down"; title = "Subscription moved lower"; }
    else title = "Steady demand";
  } else if (lead && lead.latest !== null) {
    title = lead.latest >= 1 ? "Fully subscribed" : "Early subscription";
  }

  if (ranked.length >= 2) {
    lines.push(`${ranked[0].label} demand leads the issue at ${fmtX(ranked[0].latest as number)}, followed by ${ranked[1].label} at ${fmtX(ranked[1].latest as number)}.`);
  } else if (ranked.length === 1) {
    lines.push(`${ranked[0].label} is the only category reported, at ${fmtX(ranked[0].latest as number)}.`);
  }

  if (m.total && m.total.latest !== null) {
    const t = m.total;
    const now = m.total.latest;
    if (t.prev !== null && now !== t.prev) {
      lines.push(`Overall subscription ${now > t.prev ? "rose" : "fell"} from ${fmtX(t.prev)} to ${fmtX(now)} on ${t.latestDay}.`);
    } else {
      lines.push(`Overall subscription ${m.hasHistory ? "held at" : "stands at"} ${fmtX(now)}.`);
    }
    if (t.prev !== null && t.prev < 1 && now >= 1) lines.push("The issue crossed 1x overall on the latest day.");
  }

  const under = ranked.filter((c) => (c.latest as number) < 1).map((c) => c.label);
  if (ranked.length > 1 && under.length === ranked.length) {
    lines.push("No category has reached 1x yet.");
  } else if (under.length > 0 && under.length < ranked.length) {
    lines.push(`${under.slice(0, 3).join(", ")}${under.length > 3 ? " and others" : ""} ${under.length === 1 ? "is" : "are"} still below 1x.`);
  }
  return { tone, title, lines };
}
