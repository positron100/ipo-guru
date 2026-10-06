// Runtime configuration (environment variables). Values are read lazily so tests and builds can set them.

const intEnv = (name: string, fallback: number, min: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    console.warn(`[config] ${name}="${raw}" is invalid (integer >= ${min} required); using ${fallback}`);
    return fallback;
  }
  return n;
};

export type ProviderId = "ipoguru" | "ipowatch";

/** Why the IPO Watch scraper must not run, or null when it may. Pure so it can be tested. */
export function scraperBlockReason(cfg: ReturnType<typeof ipoConfig>, nodeEnv: string | undefined): string | null {
  if (!cfg.scraper.enabled) return "IPO_DATA_PROVIDER=ipowatch requires IPO_SCRAPER_ENABLED=true";
  if (nodeEnv === "production" && !cfg.scraper.allowProduction)
    return "The IPO Watch scraper is for development/private use; production needs IPOWATCH_ALLOW_PRODUCTION=true (see IPO Watch's terms)";
  return null;
}

export function ipoConfig() {
  return {
    /** IPO_DATA_PROVIDER: ipoguru (default) | ipowatch. */
    provider: (process.env.IPO_DATA_PROVIDER ?? "ipoguru").trim().toLowerCase(),
    /** How long fetched data is reused before it may be refreshed. Pages never call providers directly. */
    detailsRevalidateSeconds: intEnv("IPO_DETAILS_REVALIDATE_SECONDS", 86_400, 60),
    gmpRevalidateSeconds: intEnv("IPO_GMP_REVALIDATE_SECONDS", 14_400, 60),
    subscriptionRevalidateSeconds: intEnv("IPO_SUBSCRIPTION_REVALIDATE_SECONDS", 14_400, 60),
    scraper: {
      /** IPO Watch scraping is off unless explicitly enabled. */
      enabled: process.env.IPO_SCRAPER_ENABLED === "true",
      /** Production use of the IPO Watch scraper needs a second, deliberate opt-in (their terms restrict commercial use). */
      allowProduction: process.env.IPOWATCH_ALLOW_PRODUCTION === "true",
      minRequestGapMs: intEnv("IPOWATCH_MIN_REQUEST_GAP_MS", 3_000, 500),
      timeoutMs: intEnv("IPOWATCH_TIMEOUT_MS", 10_000, 1_000),
      maxRetries: intEnv("IPOWATCH_MAX_RETRIES", 1, 0),
      blockedBackoffSeconds: intEnv("IPOWATCH_BLOCKED_BACKOFF_SECONDS", 1_800, 60),
      userAgent: process.env.IPOWATCH_USER_AGENT?.trim() || "IpoGmpTracker/0.1 (personal development; low-volume)",
    },
  };
}
