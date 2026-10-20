import assert from "node:assert/strict";
import test from "node:test";
import { asIpoListResult, IPO_GURU_SNAPSHOT_KEY, istDateKey, refreshIpoGuruSnapshot } from "./ipoguru-snapshot.ts";

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

test("daily refresh writes snapshot and skips duplicate attempts", async () => {
  const cache = new MemoryCache();
  let calls = 0;
  const refresh = async () => { calls++; return result; };
  const now = new Date("2026-10-20T02:00:00.000Z");
  assert.deepEqual(await refreshIpoGuruSnapshot(cache, refresh, now), { status: "updated", fetchedAt: result.fetchedAt });
  assert.deepEqual(await refreshIpoGuruSnapshot(cache, refresh, now), { status: "already-attempted" });
  assert.equal(calls, 1);
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
});

test("malformed and empty snapshots are rejected", () => {
  assert.equal(asIpoListResult({ ipos: [], fetchedAt: new Date().toISOString() }), null);
  assert.equal(asIpoListResult({ ipos: [{}], fetchedAt: "invalid" }), null);
});
