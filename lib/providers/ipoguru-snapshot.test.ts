import assert from "node:assert/strict";
import test from "node:test";
import { asIpoListResult, IPO_GURU_SNAPSHOT_KEY, istDateKey, istRefreshSlotKey, refreshIpoGuruSnapshot } from "./ipoguru-snapshot.ts";

class MemoryCache {
  values = new Map<string, unknown>();
  async get(key: string) { return this.values.get(key); }
  async set(key: string, value: unknown) { this.values.set(key, value); }
}

const result = { ipos: [{ slug: "sample-ipo" } as never], fetchedAt: "2026-10-20T00:00:00.000Z" };

test("IST day key follows midnight in India", () => {
  assert.equal(istDateKey(new Date("2026-10-19T18:29:59.000Z")), "2026-10-19");
  assert.equal(istDateKey(new Date("2026-10-19T18:30:00.000Z")), "2026-10-20");
});

test("four refresh windows are distinct and duplicate attempts within a window are skipped", async () => {
  const cache = new MemoryCache();
  let calls = 0;
  const refresh = async () => { calls++; return result; };
  const slots = [
    new Date("2026-10-19T19:30:00.000Z"), // 01:00 IST
    new Date("2026-10-20T01:30:00.000Z"), // 07:00 IST
    new Date("2026-10-20T07:30:00.000Z"), // 13:00 IST
    new Date("2026-10-20T13:30:00.000Z"), // 19:00 IST
  ];
  assert.deepEqual(slots.map(istRefreshSlotKey), ["2026-10-20:00", "2026-10-20:06", "2026-10-20:12", "2026-10-20:18"]);
  for (const now of slots) {
    assert.deepEqual(await refreshIpoGuruSnapshot(cache, refresh, now), { status: "updated", fetchedAt: result.fetchedAt });
    assert.deepEqual(await refreshIpoGuruSnapshot(cache, refresh, now), { status: "already-attempted" });
  }
  assert.equal(calls, 4);
  assert.deepEqual(cache.values.get(IPO_GURU_SNAPSHOT_KEY), result);
});

test("failed refresh consumes the daily attempt but keeps last-good snapshot", async () => {
  const cache = new MemoryCache();
  const previous = { ipos: [{ slug: "old-ipo" }], fetchedAt: "2026-10-19T00:00:00.000Z" };
  cache.values.set(IPO_GURU_SNAPSHOT_KEY, previous);
  const now = new Date("2026-10-20T02:00:00.000Z");
  await assert.rejects(refreshIpoGuruSnapshot(cache, async () => { throw new Error("429"); }, now), /429/);
  assert.deepEqual(cache.values.get(IPO_GURU_SNAPSHOT_KEY), previous);
  assert.deepEqual(await refreshIpoGuruSnapshot(cache, async () => result, now), { status: "already-attempted" });
  assert.deepEqual(await refreshIpoGuruSnapshot(cache, async () => result, new Date("2026-10-20T08:00:00.000Z")), { status: "updated", fetchedAt: result.fetchedAt });
});

test("malformed and empty snapshots are rejected", () => {
  assert.equal(asIpoListResult({ ipos: [], fetchedAt: new Date().toISOString() }), null);
  assert.equal(asIpoListResult({ ipos: [{}], fetchedAt: "invalid" }), null);
});
