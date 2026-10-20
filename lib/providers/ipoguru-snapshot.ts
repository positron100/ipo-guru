import type { IpoListResult } from "./types";

export const IPO_GURU_SNAPSHOT_KEY = "ipoguru:ipos:snapshot";
const ATTEMPT_TTL_SECONDS = 2 * 24 * 60 * 60;

export interface SnapshotCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ttl?: number; tags?: string[]; name?: string }): Promise<void>;
}

export function istDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Refreshes are scheduled at 00:30, 06:30, 12:30, and 18:30 IST. */
export function istRefreshSlotKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((item) => item.type === "hour")?.value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("Could not determine IST refresh slot");
  const slot = String(Math.floor(hour / 6) * 6).padStart(2, "0");
  return `${istDateKey(now)}:${slot}`;
}

export function asIpoListResult(value: unknown): IpoListResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<IpoListResult>;
  if (!Array.isArray(candidate.ipos) || candidate.ipos.length === 0 || typeof candidate.fetchedAt !== "string") return null;
  if (!Number.isFinite(Date.parse(candidate.fetchedAt))) return null;
  return candidate as IpoListResult;
}

/** Mark this six-hour attempt before calling upstream; only a valid response replaces last-good data. */
export async function refreshIpoGuruSnapshot(
  cache: SnapshotCache,
  refresh: () => Promise<IpoListResult>,
  now = new Date(),
): Promise<{ status: "updated"; fetchedAt: string } | { status: "already-attempted" }> {
  const attemptKey = `ipoguru:ipos:attempt:${istRefreshSlotKey(now)}`;
  if (await cache.get(attemptKey)) return { status: "already-attempted" };

  // Best-effort cross-invocation idempotency. Runtime Cache does not offer atomic SET-NX;
  // Vercel Cron is the sole caller, so page traffic cannot consume this quota.
  await cache.set(attemptKey, { startedAt: now.toISOString() }, { ttl: ATTEMPT_TTL_SECONDS, name: "IPO Guru refresh-window guard" });
  const fresh = asIpoListResult(await refresh());
  if (!fresh) throw new Error("IPO Guru refresh returned an empty or malformed IPO list");

  await cache.set(IPO_GURU_SNAPSHOT_KEY, fresh, { tags: ["ipo-guru-snapshot"], name: "IPO Guru last-good IPO snapshot" });
  return { status: "updated", fetchedAt: fresh.fetchedAt };
}
