import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInsight, buildSubscription, categoryLabel, pickKpis } from "./subscription.ts";
import type { SubscriptionData } from "./types.ts";

const day = (n: number, categories: Record<string, number | null>) => ({ day: n, label: `Day ${n}`, categories });
const full = (): SubscriptionData => ({
  days: [
    day(1, { qib: 0, nii: 0.11, bnii: 0.06, snii: 0.21, retail: 0.52, total: 0.2 }),
    day(2, { qib: 0.38, nii: 0.27, bnii: 0.16, snii: 0.49, retail: 1.32, total: 0.69 }),
    day(3, { qib: 1.06, nii: 2.05, bnii: 1.56, snii: 3.02, retail: 4.07, total: 2.26 }),
  ],
  latest: {}, updatedAtLabel: "17:37",
});

test("model keeps exactly the reported days and splits total from categories", () => {
  const m = buildSubscription(full())!;
  assert.deepEqual(m.dayLabels, ["Day 1", "Day 2", "Day 3"]);
  assert.deepEqual(m.categories.map((c) => c.key), ["qib", "nii", "bnii", "snii", "retail"]);
  assert.equal(m.total?.latest, 2.26);
  assert.equal(m.total?.prev, 0.69);
  assert.equal(m.hasHistory, true);
});

test("a day with no readings is dropped, never relabelled", () => {
  const d = full();
  d.days.push(day(4, { qib: null, retail: null, total: null }));
  assert.deepEqual(buildSubscription(d)!.dayLabels, ["Day 1", "Day 2", "Day 3"]);
  const sparse: SubscriptionData = { days: [day(1, { retail: 0.5 }), day(3, { retail: 2 })], latest: {}, updatedAtLabel: null };
  assert.deepEqual(buildSubscription(sparse)!.dayLabels, ["Day 1", "Day 3"], "Day 3 stays Day 3");
});

test("single day and overview-only feeds are honest", () => {
  const one = buildSubscription({ days: [day(1, { retail: 0.52, total: 0.2 })], latest: {}, updatedAtLabel: null })!;
  assert.equal(one.hasHistory, false);
  assert.equal(one.total?.prev, null);
  const overview = buildSubscription({ days: [], latest: { total: 2.5, retail: 3 }, updatedAtLabel: null })!;
  assert.deepEqual(overview.dayLabels, ["Latest"]);
  assert.equal(buildSubscription({ days: [], latest: {}, updatedAtLabel: null }), null);
  assert.equal(buildSubscription({ days: [day(1, { qib: null })], latest: {}, updatedAtLabel: null }), null);
});

test("no total row means no total: it is never derived", () => {
  const m = buildSubscription({ days: [day(1, { qib: 1, retail: 2 })], latest: {}, updatedAtLabel: null })!;
  assert.equal(m.total, null);
  assert.ok(!pickKpis(m).some((k) => k.key === "total"));
});

test("KPIs: total, retail, strongest NII, QIB, with deltas from the previous reported day", () => {
  const k = pickKpis(buildSubscription(full())!);
  assert.deepEqual(k.map((x) => x.key), ["total", "retail", "snii", "qib"]);
  assert.equal(k[0].value, 2.26);
  assert.ok(Math.abs((k[0].delta as number) - 1.57) < 1e-9);
  assert.equal(k[0].prevDay, "Day 2");
  assert.equal(k[1].support, "Highest category");
  assert.equal(k[3].support, "Fully subscribed");
});

test("KPIs fall back to other categories when the usual ones are missing", () => {
  const m = buildSubscription({ days: [day(1, { qib: 5, employee: 2, shareholder: 1.5, others: 0.4 })], latest: {}, updatedAtLabel: null })!;
  const k = pickKpis(m);
  assert.deepEqual(k.map((x) => x.key), ["qib", "employee", "shareholder", "others"]);
  assert.equal(k[0].delta, null, "one day: no change shown");
});

test("labels: known keys are exact, emp is Employee, unknown slugs become words", () => {
  assert.equal(categoryLabel("bnii"), "B-NII");
  assert.equal(categoryLabel("snii"), "S-NII");
  assert.equal(categoryLabel("emp"), "Employee");
  assert.equal(categoryLabel("employee"), "Employee");
  assert.equal(categoryLabel("brand-new-cat"), "Brand New Cat");
});

test("insight is built from the numbers", () => {
  const i = buildInsight(buildSubscription(full())!);
  assert.equal(i.tone, "up");
  assert.equal(i.title, "Accelerating demand", "the last rise is larger than the one before");
  assert.ok(i.lines[0].includes("Retail demand leads the issue at 4.07x, followed by S-NII at 3.02x."));
  assert.ok(i.lines.some((l) => l.includes("from 0.69x to 2.26x on Day 3")));
  assert.ok(i.lines.some((l) => l.includes("crossed 1x overall")));
});

test("insight changes with the data and never predicts or advises", () => {
  const slow = buildSubscription({ days: [day(1, { retail: 0.2, qib: 0, total: 0.1 }), day(2, { retail: 0.4, qib: 0.1, total: 0.2 })], latest: {}, updatedAtLabel: null })!;
  const i = buildInsight(slow);
  assert.equal(i.title, "Growing demand");
  assert.ok(i.lines.some((l) => /No category has reached 1x yet/.test(l)));
  const mixed = buildInsight(buildSubscription({ days: [day(1, { retail: 2, qib: 0.3 })], latest: {}, updatedAtLabel: null })!);
  assert.ok(mixed.lines.some((l) => /QIB is still below 1x/.test(l)));
  for (const ins of [i, buildInsight(buildSubscription(full())!)]) {
    assert.doesNotMatch(ins.lines.join(" ") + ins.title, /list(ing)? (higher|gain)|will|guarantee|buy|recommend|should/i);
  }
  const one = buildInsight(buildSubscription({ days: [day(1, { retail: 1.4, total: 1.1 })], latest: {}, updatedAtLabel: null })!);
  assert.equal(one.title, "Fully subscribed");
});
