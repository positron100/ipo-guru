# Handover: IPO GMP Desk (`ipo-gmp-tracker`)

Last updated: 2026-10-06. Status: **Phase 1 built and verified locally. Not committed, not deployed.**
(`git log` still shows only the `create-next-app` initial commit; all work is uncommitted.)

## 1. What this is
An Indian IPO + GMP (grey market premium) tracking site. Server-rendered Next.js pages built from a pluggable data provider.
Hard constraints from the owner: **free MVP** (no DB, no separate backend, no paid services), SEO is first-class, GMP is always labelled
unofficial / not advice, missing values stay `null` (never shown as 0), do not copy IPO Watch's UI or content.

## 2. Stack
Next.js **16.3** (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · `cheerio` (HTML parsing for the scraper) · `server-only`.
No other runtime dependencies. **Read `node_modules/next/dist/docs/` before touching Next APIs** (`AGENTS.md` says this version differs from older Next).
Caching uses `fetch(..., { next: { revalidate } })` plus page-level `export const revalidate` (no `cacheComponents`).

## 3. Architecture
```
pages / sitemap / layout
        ↓  (only import lib/ipo-data)
lib/ipo-data.ts        server-only; picks provider from IPO_DATA_PROVIDER; exposes getAllIpos/getIpo/getIpoDetail/getSource
        ↓
lib/ipo-service.ts     IpoService: validate, de-dupe by slug, merge optional enrichment, tolerate partial failure
        ↓  depends ONLY on the IpoDataProvider interface (lib/providers/types.ts)
IpoGuruProvider (default)            IpoWatchProvider (opt-in, dev/private only)
lib/providers/ipoguru-provider.ts    lib/providers/ipowatch/*
        ↓                                    ↓
IPO Guru API v2 (needs key)          IPO Watch HTML (cheerio parsers)
```
Frontends never call providers directly; every upstream response is reused through Next's data cache. No public API routes exist.

### Provider contract (`lib/providers/types.ts`)
`fetchUpcomingIpos()`, `fetchIpoDetails(slug)`, `fetchGmp(slug)`, `fetchSubscription(slug)` + `capabilities {details, gmpHistory, subscription}`.
Methods return `null` for "not available" and may throw `ProviderError`. The service only calls an optional operation if the capability flag is true.
Adding/replacing a provider = implement the interface and add a `case` in `createProvider()` in `lib/ipo-data.ts`.

## 4. Providers
### IPO Guru (default) — `lib/providers/ipoguru-provider.ts`, mapping in `lib/ipoguru-normalize.ts`
- Base `https://www.ipoguru.in/api/v2`, header `X-API-KEY` from `IPOGURU_API_KEY` (server-only, never `NEXT_PUBLIC_`).
- **Free plan: 10 requests/day, 1/minute, non-commercial / evaluation use only.** No GMP history, no category subscription, no registrar.
- Only two calls: `GET /ipos?months=12` (cached 24 h by default) and `GET /gmp` (cached 4 h). `/gmp` overrides the GMP block embedded in `/ipos`.
- `/gmp` is skipped when `/ipos` was just fetched from the network (its `Date` header < 61 s old) to respect 1 req/min; it is fetched on the next regeneration.
  Consequence: pages built at deploy time use the GMP embedded in `/ipos`.
- No `/ipos/{slug}` calls at all (Free detail adds little). History is stubbed: see the comment at the bottom of `ipoguru-provider.ts`
  (`fetchGmp` → `/ipos/{slug}/gmp/history`, scope `gmp_history`, Standard plan ₹299/mo) and set `capabilities.gmpHistory = true`.
- **Never run against the real API yet** (no key was available). Field names come from the v2 docs; verify on first live build.

### IPO Watch scraper (opt-in) — `lib/providers/ipowatch/`
**Development / private use only.** IPO Watch's Terms of Use forbid copying/republishing and limit use to personal, non-commercial.
Enabled only with `IPO_DATA_PROVIDER=ipowatch` **and** `IPO_SCRAPER_ENABLED=true`; production builds additionally need `IPOWATCH_ALLOW_PRODUCTION=true`
(guard: `scraperBlockReason()` in `lib/config.ts`). Do not remove these guards. Do not deploy publicly with it on.
- `client.ts`: robots.txt honoured, one request at a time with a minimum gap (always applied), 1 bounded retry, 403/429/bot-challenge → 30 min pause (no workaround),
  network/5xx failure → 60 s pause for optional per-IPO pages. The pause never gates the shared listing pages (so cached data keeps serving).
- Sources: 3 listing pages (live GMP table, upcoming list, subscription overview) per refresh + 3 per-IPO pages on first detail render
  (`/{slug}/`, `/{slug}-gmp-grey-market-premium/`, `/{slug}-subscription-status/`). With this provider, detail pages render on demand (not prerendered).
- Parsers locate tables by **header/label text**, not CSS classes or position (IPO Watch's tables are unclassed and reorder). Quirks handled:
  `₹-`/`N/A`/`[.]` → null, `October7, 2026`, year-less dates, `RII` = retail, SME retail minimum = 2 lots (lot = shares ÷ lots).
- Tests use **synthetic** fixtures (`fixtures.ts`), not copied site content.

## 5. Data model & rules (`lib/types.ts`, `lib/gmp.ts`, `lib/providers/validate.ts`)
- `Ipo`: slug, name, board, status, priceBand, issueSizeCr, freshIssueCr, offerForSale, lotSize, listingExchange, dates (open/close/allotment/refund/demat/listing as `YYYY-MM-DD` IST days),
  `gmp` (value ₹/share, providerPct, updatedAt, source), listing, subscriptionTotalX, optional `subscription` (day-wise categories) and `history`.
- Status is **derived from IST dates** (`resolveStatus`), because calendars are cached for hours; provider status is only a fallback.
- Formulas (`lib/gmp.ts`): estListingPrice = priceMax + GMP; estGain% = GMP ÷ priceMax × 100; gainPerLot = GMP × lot; minInvestment = priceMax × lot. Any null input → null output.
  `pctMismatch` flags provider percentage disagreeing by > 1 point (shown with `*` and a note).
- Validation nulls (never zeroes) invalid values: inverted price band, bad dates, non-integer lot, negative sizes, NaN GMP.

## 6. Pages & SEO
`/` · `/ipo-gmp-today` (client-side sort/filter, full table in server HTML) · `/upcoming-ipos` · `/ipo/[slug]` · `sitemap.xml` · `robots.txt` · 404 · error page.
Per-IPO metadata, canonical (relative; `metadataBase` from `SITE_URL`), Open Graph/Twitter, JSON-LD (BreadcrumbList, WebPage, FAQPage from visible text; no `Event`).
Thin pages (`isThin` in `lib/seo.ts`: fewer than 2 useful facts) get `noindex, follow` and are excluded from the sitemap. Fields being null alone does **not** make a page thin.
Pages revalidate every 14400 s (4 h). Footer attribution follows the active provider (`getSource()`); keep it (IPO Guru's terms require credit).
Detail pages render a GMP-history section only when `ipo.history` is populated (empty on IPO Guru Free).

## 7. Environment variables
| Var | Default | Purpose |
|---|---|---|
| `SITE_URL` | `http://localhost:3000` | canonical/sitemap/OG base. **Set in production** (no domain is hardcoded) |
| `IPO_DATA_PROVIDER` | `ipoguru` | `ipoguru` or `ipowatch` |
| `IPOGURU_API_KEY` | none | required for IPO Guru; build fails without it |
| `IPOGURU_BASE_URL` | v2 URL | test override |
| `IPO_DETAILS_REVALIDATE_SECONDS` | 86400 | `/ipos` calendar (Guru) / detail pages (Watch) |
| `IPO_GMP_REVALIDATE_SECONDS` | 14400 | `/gmp` (Guru) / GMP + listing pages (Watch) |
| `IPO_SUBSCRIPTION_REVALIDATE_SECONDS` | 14400 | subscription pages (Watch) |
| `IPO_SCRAPER_ENABLED` | off | must be `true` to use IPO Watch |
| `IPOWATCH_ALLOW_PRODUCTION` | off | second opt-in for production builds/servers |
| `IPOWATCH_MIN_REQUEST_GAP_MS` / `_TIMEOUT_MS` / `_MAX_RETRIES` / `_BLOCKED_BACKOFF_SECONDS` / `_USER_AGENT` | 3000 / 10000 / 1 / 1800 / built-in | scraper politeness |
| `IPOWATCH_BASE_URL` | `https://ipowatch.in` | tests / local mirrors only |
See `.env.example`. Intervals have a minimum of 60 s; invalid values fall back to defaults with a warning.

## 8. Commands
```bash
npm test            # 37 node:test tests (pure modules; no network)
npm run typecheck   # needs generated Next types: run `npm run build` (or `npx next typegen`) once on a fresh clone / after deleting .next
npm run lint
npm run build       # needs IPOGURU_API_KEY (or the scraper env) because pages fetch data at build time
npm run dev
```
Tests import `.ts` extensions in pure modules (`allowImportingTsExtensions`); modules marked `server-only` (`client.ts`, `ipo-data.ts`, `ipoguru-provider.ts`) are not unit-tested.
Avoid TypeScript parameter properties/enums in tested modules (Node strip-types doesn't support them).

## 9. Verified so far (2026-10-05)
- typecheck, lint, 37 tests, production build (IPO Guru default, against a **mock** of the v2 API).
- IPO Guru: pages/sitemap/robots/metadata/JSON-LD, null-vs-zero GMP, thin-page noindex, outage (warm cache serves stale; cold cache shows "temporarily unavailable" + noindex), 1/min handling, key absent from client bundles.
- IPO Watch: **one live smoke test** (robots + 1 listing + 1 detail + 1 GMP + 1 subscription page, all HTTP 200, all parsers OK) and full end-to-end runs against a local mirror:
  intervals (details/GMP/subscription) honoured in the cache, 25 concurrent requests → 3 upstream, 403/404/503/timeout/malformed HTML/missing GMP & subscription/invalid slug/site-down all degrade without breaking other pages.
- Bug found by the live test and fixed: the request gap was skipped for CDN-cached responses (5 requests went out ~400 ms apart). It is now always applied. Don't re-run the live test without cause.

## 10. Known limitations
1. **IPO Guru live shape unverified** (no key yet).
2. **IPO Guru Free = non-commercial.** The site must stay non-commercial on this plan; Vercel Hobby is also non-commercial.
3. **Listed IPO history:** no persistence exists beyond Next's non-durable data cache. IPO Guru keeps 12 months (`months=12`); IPO Watch drops IPOs from its listing pages after listing, so their pages disappear under that provider. Fix later with storage if needed.
4. Slugs differ between providers (IPO Watch `vishal-nirmiti-ipo` vs IPO Guru's); switching provider changes URLs → needs a redirect map before a real switch on a live site.
5. Free plan lacks registrar, category-wise subscription and GMP history (UI shows "Not available" / overall subscription only).
6. IPO Watch mode: first visit to a detail page takes seconds (3 serialized requests; 6–15 s when the site is down); pause/queue state is per server process.
7. `lib/ipo-service.ts` imports shared helpers (`resolveStatus`, `istToday`) from `lib/ipoguru-normalize.ts`: naming oddity, candidate for a rename to a neutral file.
8. Build needs the data source reachable (list pages throw on failure by design; a failed build beats shipping empty indexed pages).
9. **Xflot was evaluated and dropped** (undocumented ~300 requests/day keyless quota, no CORS, GMP history tagged `ipowatch` with unclear licensing). No Xflot code remains.

## 11. Suggested next steps
1. Get an IPO Guru key → `IPOGURU_API_KEY` in `.env.local`, run **one** build, diff the real payload against `lib/ipoguru-normalize.ts` assumptions (field names, `gmp` block, `status` values, `months` window). Each build spends 1–2 of the 10 daily calls.
2. Decide commercial vs non-commercial; if commercial, upgrade IPO Guru (Standard adds GMP history/subscription) and get written confirmation of terms.
3. Implement `getGmpHistory` for Standard (see §4) and re-enable history UI by populating `ipo.history`.
4. Set `SITE_URL`, deploy to Vercel only with the default provider and **without** scraper env vars; submit `sitemap.xml` to Search Console.
5. Optional: persistence for listed-IPO history; neutral rename of `ipoguru-normalize.ts`; replace the scaffold `README.md`.
6. Commit when ready (nothing is committed yet; `.env.example` is tracked, real `.env*` files are git-ignored).

## 12. Gotchas for the next session
- The local test mirrors (mock IPO Guru API, IPO Watch mirror with failure switches) were written in a temp scratchpad and are **not** in the repo. Recreate small ones if you need to test without a key: serve `GET /ipos` and `GET /gmp` in the v2 envelope `{success, plan, count, data}` and check the `X-API-KEY` header.
- `next build` overwrites `.next`; a failed build (e.g. testing guards) leaves `next start` with nothing to serve. Rebuild first.
- `.next/cache` contains the key if it was set at build time (Turbopack cache). It is git-ignored; never upload `.next`.
- On Windows, stale `next start`/mock processes keep ports (3100, 4020, 4030) busy; stop them by port before re-testing.
