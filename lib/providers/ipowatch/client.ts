import "server-only";
import { ipoConfig } from "../../config";
import { ProviderError } from "../types";
import type { PageFetcher, PageKind } from "./provider";
import { isAllowed, parseRobots } from "./robots";
import type { RobotsRules } from "./robots";
import { IPOWATCH_ORIGIN } from "./urls";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Per-process page memo. Next's data cache already avoids repeat upstream hits, but every call to `request()` still
 * waits out the politeness gap, so any re-render (every client navigation in `next dev`, ISR regeneration) paid
 * seconds of sleeping for pages that were already in hand. The memo holds the HTML for the same window the data cache
 * would (the per-kind revalidate seconds), so freshness is unchanged, and concurrent callers share one in-flight request.
 * Lives on globalThis because dev bundles the RSC and SSR layers as separate module instances. Capped, oldest first out.
 */
interface Memo { entries: Map<string, { exp: number; value: Promise<string | null> }> }
const MEMO_MAX = 120;
/** A fetch() that settles faster than this came from Next's data cache, not from the site. */
const CACHE_HIT_MS = 25;
const memo = ((globalThis as { __ipoWatchMemo?: Memo }).__ipoWatchMemo ??= { entries: new Map() });
const CHALLENGE = /just a moment\.\.\.|cf-browser-verification|cf-chl-|attention required! \| cloudflare/i;

/**
 * Polite HTTP client for IPO Watch. It honours robots.txt, runs requests strictly one at a time with a minimum
 * gap, retries only transient failures a bounded number of times, and backs off completely on 403/429 or a
 * bot-challenge page. It never tries to get around access controls. Responses go through Next's data cache, so
 * repeat page renders do not hit the site.
 */
export class IpoWatchHttpClient implements PageFetcher {
  private blockedUntil = 0;
  private lastNetworkAt = 0;
  private robots: Promise<RobotsRules> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  getHtml(url: string, kind: PageKind): Promise<string | null> {
    // One request at a time per server process, even when callers ask in parallel.
    const run = () => this.fetchPage(url, kind);
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async fetchPage(url: string, kind: PageKind): Promise<string | null> {
    const cfg = ipoConfig();
    // The pause only gates optional per-IPO pages. The shared listing pages must always reach Next's data cache,
    // so cached/stale data keeps serving during a pause (they are refetched at most once per revalidate window).
    const listing = kind === "listing" || kind === "overview";
    if (!listing && Date.now() < this.blockedUntil) throw new ProviderError("blocked", "IPO Watch requests are paused after an access error");

    const rules = await this.getRobots();
    if (!isAllowed(rules, new URL(url).pathname)) throw new ProviderError("blocked", `robots.txt disallows ${url}`);

    const revalidate = kind === "details" ? cfg.detailsRevalidateSeconds
      : kind === "subscription" || kind === "overview" ? cfg.subscriptionRevalidateSeconds : cfg.gmpRevalidateSeconds;
    const html = await this.memoised(url, revalidate, () => this.request(url, revalidate));
    if (html === null) return null;
    if (html.length < 500 || CHALLENGE.test(html)) {
      this.block();
      throw new ProviderError("blocked", `IPO Watch returned a bot-challenge or empty page for ${url}`);
    }
    return html;
  }

  /** Serve a still-fresh page from the memo; otherwise run `load` (which honours the gap) and remember it. Failures are not remembered. */
  private memoised(url: string, ttlSeconds: number, load: () => Promise<string | null>): Promise<string | null> {
    const hit = memo.entries.get(url);
    if (hit && hit.exp > Date.now()) return hit.value;
    const value = load();
    memo.entries.set(url, { exp: Date.now() + ttlSeconds * 1000, value });
    value.catch(() => { if (memo.entries.get(url)?.value === value) memo.entries.delete(url); });
    if (memo.entries.size > MEMO_MAX) memo.entries.delete(memo.entries.keys().next().value!);
    return value;
  }

  private getRobots(): Promise<RobotsRules> {
    this.robots ??= this.request(`${IPOWATCH_ORIGIN}/robots.txt`, 86_400)
      .then((t) => parseRobots(t ?? ""))
      .catch((e) => { this.robots = null; throw e; });
    return this.robots;
  }

  private block() {
    this.blockedUntil = Date.now() + ipoConfig().scraper.blockedBackoffSeconds * 1000;
  }

  /** After the site is unreachable or erroring (retries exhausted), skip optional per-IPO pages briefly so one outage
   *  costs one timeout, not one per request. Listing pages are never gated. */
  private pauseBriefly() {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + 60_000);
  }

  private async request(url: string, revalidate: number): Promise<string | null> {
    const { scraper } = ipoConfig();
    for (let attempt = 0; ; attempt++) {
      const wait = this.lastNetworkAt + scraper.minRequestGapMs - Date.now();
      if (wait > 0) await sleep(wait);
      let res: Response;
      const startedAt = Date.now();
      try {
        res = await fetch(url, {
          headers: { "user-agent": scraper.userAgent, accept: "text/html,text/plain" },
          next: { revalidate, tags: ["ipowatch"] },
          signal: AbortSignal.timeout(scraper.timeoutMs),
        });
      } catch (e) {
        this.lastNetworkAt = Date.now();
        if (attempt < scraper.maxRetries) { await sleep(2000 * (attempt + 1)); continue; }
        this.pauseBriefly();
        throw new ProviderError("unavailable", `IPO Watch ${url} unreachable: ${e instanceof Error ? e.message : e}`);
      }
      // The politeness gap protects the upstream site, so only a real round trip starts it. A response served from
      // Next's data cache returns in a few ms; a request that actually reaches the site never does (TLS + RTT alone
      // exceed CACHE_HIT_MS), so anything slower than that is treated as network traffic and gaps the next request.
      if (Date.now() - startedAt >= CACHE_HIT_MS) this.lastNetworkAt = Date.now();

      if (res.status === 404) return null;
      if (res.status === 403 || res.status === 429) {
        this.block(); // no retry, no workaround
        throw new ProviderError("blocked", `IPO Watch ${url} -> HTTP ${res.status}`);
      }
      if (res.status >= 500 && attempt < scraper.maxRetries) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) {
        if (res.status >= 500) this.pauseBriefly();
        throw new ProviderError("unavailable", `IPO Watch ${url} -> HTTP ${res.status}`);
      }
      return res.text();
    }
  }
}
