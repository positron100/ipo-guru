import { test } from "node:test";
import assert from "node:assert/strict";
import { ipoConfig, scraperBlockReason } from "./config.ts";

const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try { fn(); } finally { process.env = saved; }
};

test("defaults: IPO Guru provider, scraper off, intervals from defaults", () => {
  withEnv({ IPO_DATA_PROVIDER: undefined, IPO_SCRAPER_ENABLED: undefined, IPO_GMP_REVALIDATE_SECONDS: undefined }, () => {
    const c = ipoConfig();
    assert.equal(c.provider, "ipoguru");
    assert.equal(c.scraper.enabled, false);
    assert.equal(c.gmpRevalidateSeconds, 14400);
  });
});

test("intervals are configurable; invalid values fall back to the default", () => {
  withEnv({ IPO_GMP_REVALIDATE_SECONDS: "900", IPO_DETAILS_REVALIDATE_SECONDS: "abc", IPO_SUBSCRIPTION_REVALIDATE_SECONDS: "5" }, () => {
    const c = ipoConfig();
    assert.equal(c.gmpRevalidateSeconds, 900);
    assert.equal(c.detailsRevalidateSeconds, 86400);
    assert.equal(c.subscriptionRevalidateSeconds, 14400, "below the minimum is rejected");
  });
});

test("scraper guard: off by default; production needs a second opt-in", () => {
  withEnv({ IPO_SCRAPER_ENABLED: undefined, IPOWATCH_ALLOW_PRODUCTION: undefined }, () => {
    assert.match(scraperBlockReason(ipoConfig(), "development") ?? "", /IPO_SCRAPER_ENABLED/);
  });
  withEnv({ IPO_SCRAPER_ENABLED: "true", IPOWATCH_ALLOW_PRODUCTION: undefined }, () => {
    assert.equal(scraperBlockReason(ipoConfig(), "development"), null);
    assert.match(scraperBlockReason(ipoConfig(), "production") ?? "", /IPOWATCH_ALLOW_PRODUCTION/);
  });
  withEnv({ IPO_SCRAPER_ENABLED: "true", IPOWATCH_ALLOW_PRODUCTION: "true" }, () => {
    assert.equal(scraperBlockReason(ipoConfig(), "production"), null);
  });
});
