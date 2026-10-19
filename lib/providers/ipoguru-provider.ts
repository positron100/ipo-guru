import "server-only";
import { ipoConfig } from "../config";
import { isObj, normalizeIpo } from "../ipoguru-normalize";
import type { Ipo } from "../types";
import { ProviderError } from "./types";
import type { GmpData, IpoDataProvider, IpoListResult, ProviderCapabilities } from "./types";

const TIMEOUT_MS = 8000;
const CALENDAR_MONTHS = 12;

/**
 * IPO Guru API v2, Free plan (10 requests/day, 1/minute): one GET /ipos call every three hours.
 * That response already includes current GMP for every IPO, which avoids consuming the quota on a second
 * collection endpoint. Details, GMP history and subscription breakdown are not used by this provider.
 */
export class IpoGuruProvider implements IpoDataProvider {
  readonly name = "IPO Guru";
  readonly url = "https://www.ipoguru.in";
  readonly capabilities: ProviderCapabilities = { details: false, gmpHistory: false, subscription: false };

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
      throw new Error(`IPO Guru ${path} -> HTTP ${res.status} ${code}`);
    }
    const json: unknown = await res.json();
    if (!isObj(json) || json.success !== true || !Array.isArray(json.data)) throw new Error(`IPO Guru ${path} -> unexpected response shape`);
    return { json, date: res.headers.get("date") };
  }

  async fetchUpcomingIpos(): Promise<IpoListResult> {
    const cfg = ipoConfig();
    // Eight calls/day at most on the default 3-hour cache window, below the Free-plan quota of ten.
    // /ipos embeds current GMP, so there is deliberately no follow-up /gmp request.
    const cal = await this.call(`/ipos?months=${CALENDAR_MONTHS}`, cfg.ipoguruRevalidateSeconds, ["ipos"]);
    const ipos = (cal.json.data as unknown[]).map((r) => normalizeIpo(r)).filter((x): x is Ipo => x !== null);
    if (ipos.length === 0) throw new ProviderError("parse", "IPO Guru /ipos: empty list, treating as failure");
    const t = cal.date ? Date.parse(cal.date) : NaN;
    return { ipos, fetchedAt: new Date(Number.isNaN(t) ? Date.now() : t).toISOString() };
  }

  async fetchIpoDetails(): Promise<Ipo | null> { return null; }
  async fetchGmp(): Promise<GmpData | null> { return null; }
  async fetchSubscription(): Promise<null> { return null; }
}
