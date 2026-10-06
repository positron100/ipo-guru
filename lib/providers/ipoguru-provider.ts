import "server-only";
import { ipoConfig } from "../config";
import { isObj, mergeGmp, normalizeIpo } from "../ipoguru-normalize";
import type { Ipo } from "../types";
import { ProviderError } from "./types";
import type { GmpData, IpoDataProvider, IpoListResult, ProviderCapabilities } from "./types";

const TIMEOUT_MS = 8000;
const MIN_GAP_MS = 61_000; // free plan: 1 request/minute
const CALENDAR_MONTHS = 12;

class UpstreamError extends Error {
  readonly retryAfterMs: number;
  constructor(message: string, retryAfterMs = 0) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * IPO Guru API v2, Free plan (10 requests/day, 1/minute): only the two collection endpoints, GET /ipos and GET /gmp.
 * Details, GMP history and subscription breakdown need paid scopes, so those operations return null and the
 * capabilities say so; the service never calls them. To use the Standard plan later, implement fetchGmp()
 * with GET /ipos/{slug}/gmp/history and flip capabilities.gmpHistory.
 */
export class IpoGuruProvider implements IpoDataProvider {
  readonly name = "IPO Guru";
  readonly url = "https://www.ipoguru.in";
  readonly capabilities: ProviderCapabilities = { details: false, gmpHistory: false, subscription: false };

  // After a 1/min or daily-quota 429, skip the optional /gmp call and use the GMP embedded in /ipos.
  // Never gates /ipos, so cached and stale calendar data keeps serving.
  private gmpBlockedUntil = 0;

  private async call(path: string, revalidate: number, tags: string[]): Promise<{ json: Record<string, unknown>; date: string | null }> {
    const key = process.env.IPOGURU_API_KEY;
    if (!key) throw new ProviderError("config", "IPOGURU_API_KEY is not set");
    const base = process.env.IPOGURU_BASE_URL ?? "https://www.ipoguru.in/api/v2";
    const res = await fetch(`${base}${path}`, {
      headers: { "X-API-KEY": key, accept: "application/json" },
      next: { revalidate, tags },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null);
      const code = isObj(body) && typeof body.error === "string" ? body.error : String(res.status);
      if (res.status === 429) {
        const retry = isObj(body) && typeof body.retry_after === "number" ? body.retry_after * 1000 : 60_000;
        throw new UpstreamError(`IPO Guru ${path} -> 429 ${code}`, code === "daily_quota_reached" ? 3_600_000 : retry);
      }
      throw new UpstreamError(`IPO Guru ${path} -> HTTP ${res.status} ${code}`);
    }
    const json: unknown = await res.json();
    if (!isObj(json) || json.success !== true || !Array.isArray(json.data)) throw new UpstreamError(`IPO Guru ${path} -> unexpected response shape`);
    return { json, date: res.headers.get("date") };
  }

  async fetchUpcomingIpos(): Promise<IpoListResult> {
    const cfg = ipoConfig();
    // Free-plan budget: /ipos 1/day + /gmp 6/day. Pages never call upstream directly.
    const cal = await this.call(`/ipos?months=${CALENDAR_MONTHS}`, cfg.detailsRevalidateSeconds, ["ipos"]);
    let ipos = (cal.json.data as unknown[]).map((r) => normalizeIpo(r)).filter((x): x is Ipo => x !== null);
    if (ipos.length === 0) throw new ProviderError("parse", "IPO Guru /ipos: empty list, treating as failure");

    // One collection call for fresher GMP; never one call per IPO.
    // If /ipos was just fetched from the network (its Date header is fresh; cached responses keep their original
    // Date), skip /gmp now: the 1/min limit would reject it. It is fetched on a later regeneration.
    const calendarAgeMs = cal.date ? Date.now() - Date.parse(cal.date) : Infinity;
    if (calendarAgeMs >= MIN_GAP_MS && Date.now() >= this.gmpBlockedUntil) {
      try {
        const gmp = await this.call("/gmp", cfg.gmpRevalidateSeconds, ["gmp"]);
        ipos = mergeGmp(ipos, gmp.json.data as unknown[]);
      } catch (e) {
        if (e instanceof UpstreamError && e.retryAfterMs) this.gmpBlockedUntil = Date.now() + e.retryAfterMs;
        console.warn("[ipoguru] /gmp unavailable, using GMP embedded in /ipos:", e instanceof Error ? e.message : e);
      }
    }
    const t = cal.date ? Date.parse(cal.date) : NaN;
    return { ipos, fetchedAt: new Date(Number.isNaN(t) ? Date.now() : t).toISOString() };
  }

  async fetchIpoDetails(): Promise<Ipo | null> { return null; }
  async fetchGmp(): Promise<GmpData | null> { return null; }
  async fetchSubscription(): Promise<null> { return null; }
}
