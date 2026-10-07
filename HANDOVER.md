# Handover: IPO GMP Desk (`ipo-gmp-tracker`)

Last updated: 2026-10-07. Status: **feature-complete and QA'd locally; mobile-first pass and the Breathing UI are committed and pushed to GitHub (`positron100/ipo-guru`, branch `main`, commit `ea18aa5`).
The first Vercel deploy failed on the data source (see section 12); it needs the scraper env vars set.**

## 1. What this is
An Indian IPO + GMP (grey market premium) tracking site. Server-rendered Next.js pages built from a pluggable data provider, with a glass UI,
a shared motion system, a mobile-first layout (phones are a designed layout, not shrunken desktop), and a contact letter.
Hard constraints from the owner: **free MVP** (no DB, no separate backend, no paid services), SEO is first-class, GMP is always labelled
unofficial / not advice, missing values stay `null` (never shown as 0), do not copy IPO Watch's UI or content.

**Operating decision:** the owner has **no IPO Guru API key**, so the project is run on the **IPO Watch scraper** (`IPO_DATA_PROVIDER=ipowatch`).
The code default is still `ipoguru` (see section 4); that is why any environment without the scraper variables fails to build.

## 2. Stack
Next.js **16.3** (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · **framer-motion** · `cheerio` (scraper parsing) · `server-only`.
No other runtime dependencies. **Read `node_modules/next/dist/docs/` before touching Next APIs** (`AGENTS.md` says this version differs from older Next).
Caching uses `fetch(..., { next: { revalidate } })` plus page-level `export const revalidate` (no `cacheComponents`). Fonts: Inter + JetBrains Mono via `next/font`.

## 3. Architecture
```
pages / sitemap / layout
        ↓  (only import lib/ipo-data)
lib/ipo-data.ts        server-only; picks provider from IPO_DATA_PROVIDER; exposes getAllIpos/getIpo/getIpoDetail/getSource
        ↓
lib/ipo-service.ts     IpoService: validate, de-dupe by slug, merge optional enrichment, tolerate partial failure
        ↓  depends ONLY on the IpoDataProvider interface (lib/providers/types.ts)
IpoGuruProvider (code default)       IpoWatchProvider (opt-in; what the owner runs)
lib/providers/ipoguru-provider.ts    lib/providers/ipowatch/*
        ↓                                    ↓
IPO Guru API v2 (needs key)          IPO Watch HTML (cheerio parsers)
```
Frontends never call providers directly; every upstream response is reused through Next's data cache (plus a `globalThis` memo in the scraper client).
The only API route is `POST /api/contact` (section 8).

### Provider contract (`lib/providers/types.ts`)
`fetchUpcomingIpos()`, `fetchIpoDetails(slug)`, `fetchGmp(slug)`, `fetchSubscription(slug)` + `capabilities {details, gmpHistory, subscription}`.
Methods return `null` for "not available" and may throw `ProviderError`. The service only calls an optional operation if the capability flag is true.
Adding/replacing a provider = implement the interface and add a `case` in `createProvider()` in `lib/ipo-data.ts`.

## 4. Providers
### IPO Guru (code default) — `lib/providers/ipoguru-provider.ts`, mapping in `lib/ipoguru-normalize.ts`
- Base `https://www.ipoguru.in/api/v2`, header `X-API-KEY` from `IPOGURU_API_KEY` (server-only, never `NEXT_PUBLIC_`).
  Checked 2026-10-07: no header gives HTTP 401, an invalid key gives HTTP 403 `invalid_key`; an unset env var throws `IPOGURU_API_KEY is not set` before any request.
- **Free plan: 10 requests/day, 1/minute, non-commercial / evaluation use only.** No GMP history, no category subscription, no registrar.
- Only two calls: `GET /ipos?months=12` (cached 24 h by default) and `GET /gmp` (cached 4 h). `/gmp` overrides the GMP block embedded in `/ipos`.
- `/gmp` is skipped when `/ipos` was just fetched from the network (its `Date` header < 61 s old) to respect 1 req/min; it is fetched on the next regeneration.
- No `/ipos/{slug}` calls at all. History is stubbed: see the comment at the bottom of `ipoguru-provider.ts`
  (`fetchGmp` → `/ipos/{slug}/gmp/history`, scope `gmp_history`, Standard plan ₹299/mo) and set `capabilities.gmpHistory = true`.
- **Never run against the real API** (no key). Field names come from the v2 docs; verify on first live build.

### IPO Watch scraper (opt-in) — `lib/providers/ipowatch/`
**Development / private use only.** IPO Watch's Terms of Use forbid copying/republishing and limit use to personal, non-commercial.
Enabled only with `IPO_DATA_PROVIDER=ipowatch` **and** `IPO_SCRAPER_ENABLED=true`; production builds additionally need `IPOWATCH_ALLOW_PRODUCTION=true`
(guard: `scraperBlockReason()` in `lib/config.ts`). Do not remove these guards.
- `client.ts`: robots.txt honoured, one request at a time with a minimum gap (always applied, also for CDN-cached responses), 1 bounded retry,
  403/429/bot-challenge → 30 min pause (no workaround), network/5xx failure → 60 s pause for optional per-IPO pages.
  The pause never gates the shared listing pages (so cached data keeps serving). `IPOWATCH_USER_AGENT` (optional) sets the identifying User-Agent;
  default `IpoGmpTracker/0.1 (personal development; low-volume)`.
- Sources: 3 listing pages (live GMP table, upcoming list, subscription overview) per refresh + 3 per-IPO pages on first detail render
  (`/{slug}/`, `/{slug}-gmp-grey-market-premium/`, `/{slug}-subscription-status/`). With this provider, **detail pages render on demand** (not prerendered).
- Parsers locate tables by **header/label text**, not CSS classes or position. Quirks handled:
  `₹-`/`N/A`/`[.]` → null, `October7, 2026`, year-less dates, `RII` = retail, SME retail minimum = 2 lots (lot = shares ÷ lots).
- Tests use **synthetic** fixtures (`fixtures.ts`), not copied site content.

## 5. Data model & rules (`lib/types.ts`, `lib/gmp.ts`, `lib/providers/validate.ts`)
- `Ipo`: slug, name, board, status, priceBand, issueSizeCr, freshIssueCr, offerForSale, lotSize, listingExchange, dates (open/close/allotment/refund/demat/listing as `YYYY-MM-DD` IST days),
  `gmp` (value ₹/share, providerPct, updatedAt, source), listing, subscriptionTotalX, optional `subscription` (day-wise categories) and `history`.
- Status is **derived from IST dates** (`resolveStatus`), because calendars are cached for hours; provider status is only a fallback.
- Formulas (`lib/gmp.ts`): estListingPrice = priceMax + GMP; estGain% = GMP ÷ priceMax × 100; gainPerLot = GMP × lot; minInvestment = priceMax × lot. Any null input → null output.
  `pctMismatch` flags provider percentage disagreeing by > 1 point (shown with `*` and a note).
- Validation nulls (never zeroes) invalid values: inverted price band, bad dates, non-integer lot, negative sizes, NaN GMP.
- `lib/subscription.ts` builds the subscription view model (KPIs, momentum series, matrix, plain-language insight). Exact figures are never altered to fit the UI.

## 6. Pages & SEO
`/` · `/ipo-gmp-today` (market board: lifecycle tabs, Mainboard/SME, sort, expandable rows) · `/upcoming-ipos` · `/ipo/[slug]` · `/contact` · `sitemap.xml` · `robots.txt` · 404 · error page.
Per-IPO metadata, canonical (relative; `metadataBase` from `SITE_URL`), Open Graph/Twitter, JSON-LD (BreadcrumbList, WebPage, FAQPage from visible text; no `Event`).
Thin pages (`isThin` in `lib/seo.ts`: fewer than 2 useful facts) get `noindex, follow` and are excluded from the sitemap.
Pages revalidate every 14400 s (4 h). Footer attribution follows the active provider (`getSource()`); keep it (IPO Guru's terms require credit).
The footer is hidden on `/contact` via a marker (`<div data-no-footer hidden />` plus one CSS rule), no JS.
`SITE_URL` is the deployed origin used for canonical/sitemap/robots/JSON-LD; unset in production it falls back to localhost with a warning.

## 7. UI, design system and motion
- **Glass system** (`app/globals.css`): tokens for surfaces, borders, shadows and blur (`--blur`, `--blur-sm`); `GlassStatic` (server-safe surfaces) vs `Glass.tsx`
  (`GlowCard`: tilt + localised cursor spotlight, mouse-only). Depth levels: background (ambient drifting blobs + a few px of scroll parallax), glass sections, interactive cards, active element.
  Cards never brighten on hover: only a lift, a firmer border and a 220px spotlight. The IPO name turns lavender on hover, focus and press.
- **Motion vocabulary** (`components/motion/tokens.ts`, mirrored as CSS variables): durations micro 0.15 / interactive 0.2 / transition 0.3 / reveal 0.5 / cinematic 1.2 s; easings
  `--ease-out`, `--ease-in-out`, `--ease-draw`, `--ease-cinematic`; springs `snappy`, `soft`, `indicator`, `flow`, `magnet`. Use these instead of literals; levels are not stacked on one element.
  Primitives: `Magnetic`, `GlowCard`, `Liquid` (a single moving pill for filters, dropdowns and the navbar), `InView`, `CountUp`, the `.enter/.kid/.reveal` staggers, `.btn` press.
  Reduced motion is honoured everywhere (framer `MotionConfig`, hook checks, a global CSS rule).
- **Navigation feel:** cards are real `<Link>`s; `WarmLink` prefetches on intent and warms detail pages after a 200 ms dwell; `RouteProgress` is a hairline bar; every route has a `loading.tsx`
  skeleton; `ScrollTop` (inside `LoadingShell`) starts a cold forward navigation at the top while back/forward still restore scroll.
- **Data motion:** `CountUp` runs once, when first seen, on headline GMP / GMP % / subscription multiples (not table cells); the server text is the exact final value. `Fresh` shows a relative
  "updated N min ago" with a pulse that stops after 6 h.
- **Opening animation** (`components/OpeningAnimation.tsx` + the "Opening animation" block in `globals.css`): a CSS-only, server-rendered SVG overlay of about 2.3 s: the growth line draws over 1.1 s,
  the endpoint pulses, then a circular reveal runs 1.0 s from the **measured** endpoint (origin and covering radius are set by a tiny inline script, re-measured once layout settles and on load/resize, never per frame).
  It plays on every full page load and never on in-app navigation. Click/tap/key skips it; reduced motion gets a 0.3 s fade; a 2.8 s safety timer forces it off; the overlay never takes pointer events.
  Dev: `?intro=0` skips it. All its timings are literals in that CSS block (kept out of the shared tokens on purpose).
- **Breathing UI** (`components/Breathing.tsx` + the "Breathing UI" block at the end of `app/globals.css`): motion that carries meaning. Rules: data moves with meaning, direction moves continuously, a changed value animates only when it really changed. Level 0 static (closed/listed IPOs, history, labels, legal text); level 1 idle (`BreathingArrow` drifts the way it points, `.dot-breathe` ring on the latest-day dot, `ClosingClock` pulses faster as the close date nears and only within 3 IST days, `.rail-seg` light travelling the category progression rail, `CtaArrow` drifts further on hover/press, `.chart-latest-ring` on the chart's latest point, the `▲▼` in `PctPill` drift unless `still`); level 3 only on the spotlight and the open top-mover card: `.breathe-card` breathes their SHADOW and BORDER only. The owner rejected a lavender gradient/glow wash on big cards, so never add a background, gradient or radial glow to them. Idle motion is gated by `still` / status (closed, listed, no-GMP rows never move) and stays under ~25 running infinite animations per page. Everything stops under `prefers-reduced-motion`. Not built on purpose: idle odometer/digit cycling on unchanged numbers (it would imply false movement; the data refreshes only every few hours), rolling digits on change (needs last-seen values stored client-side).
- **Theme:** `data-theme` is set by an inline script before paint; the toggle uses a View Transition circular clip-path reveal from the toggle's real rect (`themeReveal.ts`).
- **Phone filters:** on GMP Today below 640px the wrapping pill row is replaced by a `[Filters] [Sort]` row that opens `components/BottomSheet.tsx` (portalled to `<body>`, transform/opacity only, scroll lock, Escape/backdrop/close, safe-area padding, 44px choices, active-filter badge). The desktop pill row and `Select` are unchanged. On phones the board swaps rows without per-row `layout` animation (less jank).
- **Pills / Liquid:** `Pills fit` (used by the subscription chart filter) keeps every option on one line on phones, filling the card width, and scrolls sideways only if more than ~6 categories exist. `LiquidIndicator` sizes to the selected option's own row when options wrap (it used to span all rows).

## 8. Contact page
`/contact`: an editorial intro on the left and the **"Dear Mukul" letter** on the right (`components/contact/ContactLetter.tsx`, ported from the owner's CloudBook project: one element that is the paper, the folding
envelope and the confirmation; ruled paper and typing previews). "Seal & Send" POSTs to `app/api/contact/route.ts`, which calls `lib/contact.ts` (re-validates, strips control characters, 3 requests per minute per IP in memory,
and relays via Resend with the writer as Reply-To). It needs `RESEND_API_KEY`, `CONTACT_EMAIL` and `EMAIL_FROM`; without them the letter unwinds and shows a generic error. `ContactReach` copies the address
to the clipboard (it never opens a mail client). The owner's address is hardcoded in `ContactLetter.tsx` (copy pill and error link) and is the default `CONTACT_EMAIL` in `.env.example`.
Tests: `lib/contact.test.ts`.

## 9. Mobile and accessibility
- Audited at 320, 360, 375, 390, 414, 430, 480 and 768 px on every route (browser touch emulation): no horizontal overflow, no clipped numbers.
- Touch: hover styles are gated to real hover; tilt, magnetic and hover pills are mouse-only; static glass cards drop `backdrop-filter` on touch/small screens (the navbar and open menu keep it);
  small controls get an invisible hit area of at least 44 px via `.hit` / `.hit-y` / `.hit-text` (coarse pointers only); the contact inputs are 44 px tall and 16 px (no iOS focus zoom) with an unchanged footprint;
  `viewport-fit=cover` with safe-area insets on page gutters, the fixed navbar and the scroll arrow; `scroll-padding-block` keeps focused fields clear of the navbar.
- **Mobile conventions:** mobile-first Tailwind; phone values are the base and the old desktop value is restored at `sm:`/`lg:`, so desktop (>= 1024px) is unchanged. Card text is smaller on phones (below 640px) so content fills the card. The page-level scroll arrow is hidden on touch devices (it only replaces the hidden scrollbar and covered text).
- Subscription on phones: the KPI cards are ONE joined module (shared outer border, hairline dividers): Total spans the row, categories pair in near-square cells, an odd last category spans the row (2+1); the comparison reads as one unit ("vs Day N" attached). The category-wise section is a separate phone layout (`MobileCategories` in `SubscriptionMatrix.tsx`): one card per category with the latest value as headline and a vertical rail through the days; the desktop matrix is unchanged (hidden below 640px).
- Tap-to-inspect on the subscription chart: the reading stays after the finger lifts (touch `pointerleave` fires on release) and clears on a tap outside.
- Contrast: text tokens were checked against WCAG AA in both themes (218 samples, none near the threshold after raising `--fg-faint` in both themes and darkening the light `--gain`).
  Known exception: the faint rule lines under the letter's inputs are decorative paper lines (below 3:1 as non-text UI); the focus state passes.

## 10. Environment variables
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
| `RESEND_API_KEY`, `CONTACT_EMAIL`, `EMAIL_FROM` | none | contact letter delivery (server-only) |

See `.env.example`. Intervals have a minimum of 60 s; invalid values fall back to defaults with a warning.
**A local `.env.local` for the scraper needs three lines:** `IPO_DATA_PROVIDER=ipowatch`, `IPO_SCRAPER_ENABLED=true`, `IPOWATCH_ALLOW_PRODUCTION=true` (the last only for `build`/`start`).

## 11. Commands
```bash
npm test            # 51 node:test tests (pure modules; no network)
npm run typecheck   # needs generated Next types: run `npm run build` (or `npx next typegen`) once on a fresh clone / after deleting .next
npm run lint
npm run build       # needs a configured provider because pages fetch data at build time
npm run dev
```
Tests import `.ts` extensions in pure modules (`allowImportingTsExtensions`); modules marked `server-only` (`client.ts`, `ipo-data.ts`, `ipoguru-provider.ts`) are not unit-tested.
Avoid TypeScript parameter properties/enums in tested modules (Node strip-types doesn't support them).

## 12. Deployment state and the Vercel failure
GitHub: `https://github.com/positron100/ipo-guru` (`main`, no force pushes). The first Vercel build failed in `app/ipo-gmp-today/page.tsx` with an `UpstreamError` from `IPO Guru /ipos -> HTTP ...`:
Vercel had no `IPO_DATA_PROVIDER`, so it used the default (IPO Guru) with no valid key. **Fix (the owner's choice, not yet applied):** add to Vercel (Production, and Preview if used)
`IPO_DATA_PROVIDER=ipowatch`, `IPO_SCRAPER_ENABLED=true`, `IPOWATCH_ALLOW_PRODUCTION=true` and `SITE_URL=<deployed url>` (plus the three contact variables), then redeploy.
Risks: IPO Watch may block Vercel's IPs (403 or a bot challenge gives a 30 minute pause, and the build fails by design; nothing is worked around), and running the scraper on a public site is outside the private-use limit
of IPO Watch's terms. A possible follow-up (needs the owner's approval): let a failed data fetch degrade a page instead of failing the whole build.

## 13. Verified so far
- typecheck, lint, 51 tests and a production build (scraper provider) after every phase; last full QA 2026-10-07.
- Browser checks: navigation timing, back/forward scroll restore, cold-route skeleton scroll, layout shift under 0.002, overflow at 8 phone/tablet widths, contrast, touch targets, opening-animation timing and origin
  (exact at every width and on desktop), contact fields (44 px, tap-anywhere focus, visible with a keyboard-sized viewport), and a desktop regression at 1440.
- IPO Guru path: pages/sitemap/robots/metadata/JSON-LD against a mock of the v2 API; **never against the real API**.
- IPO Watch: one live smoke test and local-mirror failure drills (403/404/503/timeout/malformed HTML/site-down all degrade without breaking other pages). Don't re-run the live test without cause.
- Mobile pass (2026-10-07): 24 route x width combinations at 360/375/390/412/430/462 with touch emulation (no overflow, no clipped text, every tap target >= 44px counting the hit area), filter/sort sheets, menu, row expand, chart tap, CTAs; desktop geometry at 1440 diffed against the original code (identical apart from added wrappers). Breathing UI audit: 1280/1440/1920, CLS about 0, no console errors, zero running infinite animations under reduced motion, financial numbers unchanged after the one-time count-ups settle.

## 14. Known limitations / not verified
1. **IPO Guru live shape unverified** (no key). The free plan is non-commercial; Vercel Hobby is also non-commercial.
2. **Scraper on public hosting:** a terms restriction and possible IP blocking (section 12). The first visit to a detail page takes seconds (3 serialized requests; 6–15 s when the site is down); pause/queue state is per server process.
3. **Listed IPO history:** no persistence beyond Next's non-durable data cache. IPO Watch drops IPOs from its listing pages after listing, so their pages disappear under that provider.
4. Slugs differ between providers; switching provider changes URLs, so a redirect map is needed before a real switch on a live site.
5. The free IPO Guru plan lacks registrar, category-wise subscription and GMP history (the UI shows "Not available" / overall subscription only).
6. `lib/ipo-service.ts` imports shared helpers (`resolveStatus`, `istToday`) from `lib/ipoguru-normalize.ts`: a naming oddity, a candidate for a neutral rename.
7. **Not tested:** real phones and iOS Safari, the on-screen keyboard, landscape and notched devices (only that the safe-area values exist), a full screen-reader pass, and widths between the audited ones.
8. The opening animation (about 2.3 s) is longer than the 1.5–1.8 s once agreed; the owner later asked for it to be slowed down. Adjust the literals in the "Opening animation" CSS block if it should shrink again.
9. Contact: the letter's rule lines are decorative (see section 9) and the owner's email is hardcoded in the UI.
10. Xflot was evaluated and dropped (undocumented keyless quota, no CORS, unclear licensing). No Xflot code remains.
11. Only one live IPO has subscription data (3 days), so 4-day / 100x+ layouts were tested with a temporary mock route (deleted), never with real data. KPI order is the existing ranking (Total, Retail, NII, QIB).
12. Breathing UI gaps by choice: no rolling/odometer digits and no stored last-seen values (nothing animates a number unless it truly changes, and data refreshes only every few hours); the closing clock is day-level (IST), not hour-level; the desktop matrix has no travelling light (the rail exists only in the phone layout; desktop gets a breathing latest-day dot and the chart's latest-point ring).

## 15. Suggested next steps
1. Set the Vercel env vars (section 12) and redeploy; if the scraper is blocked, decide between a key-based provider and graceful degradation at build time.
2. Decide commercial vs non-commercial; if commercial, get an IPO Guru key (Standard adds GMP history/subscription), confirm terms in writing, and verify `lib/ipoguru-normalize.ts` against one real build (each build spends 1–2 of the 10 daily calls).
3. Implement `getGmpHistory` for Standard (see section 4) and re-enable the history UI by populating `ipo.history`.
4. Set `SITE_URL` and the contact variables, and submit `sitemap.xml` to Search Console.
5. Optional: persistence for listed-IPO history; a neutral rename of `ipoguru-normalize.ts`; a real-device mobile pass (iOS Safari especially: sheet scroll lock, safe areas, tap-to-inspect); real data-change number transitions once last-seen values can be stored.

## 16. Gotchas
- `next build` overwrites `.next`; a failed build leaves `next start` with nothing to serve. Rebuild first. Stale `next start` processes keep ports busy on Windows; stop them by port before re-testing.
- Builds run in several workers and each fetches data; with the scraper the request gap applies per process. `.next/cache` can contain keys if they were set at build time; it is git-ignored, never upload `.next`.
- `.env.local` is git-ignored. If a build says `IPOGURU_API_KEY is not set`, the scraper variables are missing from that environment, not the key.
- The test mirrors (a mock IPO Guru API and an IPO Watch mirror with failure switches) were written in a temp scratchpad and are not in the repo.
- Windows prints `LF will be replaced by CRLF` warnings on `git add`; they are harmless (autocrlf).
- Browser-testing notes: prefer instant scrolling (`behavior: 'instant'`, since the page uses smooth scroll); screenshots with `animations: 'disabled'` jump animations to their end; a window resized to a phone width is not touch emulation (use `isMobile`/`hasTouch` contexts).
- **Tailwind v4 `text-sm/base/xs` also set line-height.** On an element that already has `t-body`/`t-small`, a `sm:text-base` or a base `text-sm` silently changes its line height on desktop. Use font-size-only values there (`sm:text-[1rem]`, `text-[0.875rem]`). This caused a real 1-3px desktop regression that a rect-by-rect diff against the original code caught.
- `position: fixed` inside an ancestor with a transform/`translate` animation (`.enter`, `.reveal`) is trapped by it (and its z-index): portal overlays to `<body>` (see `BottomSheet`).
- Playwright against the dev server: `waitUntil: 'networkidle'` never settles because `WarmLink` prefetches queue scraper requests; use `load` plus a wait. Console output goes to `.playwright-mcp/console-*.log` only if that folder exists, and it must be deleted before committing.
- Desktop-regression method that worked: dump `tag|WxH|x,y` for every element on 4 routes at 1440, run the original code (git stash of the files, or a worktree), diff. Turbopack rejects a symlinked/junctioned `node_modules` outside the project root (use `next dev --webpack` or copy); removing a worktree that contains a `node_modules` junction must remove the junction first or it can delete the real folder's contents.
