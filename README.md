# IPO GMP Desk

An Indian IPO and GMP (grey market premium) tracker. Open and upcoming IPOs, unofficial GMP set against the price band, day-wise subscription, and a clean glass UI that works on phones as well as desktops.

> **GMP is unofficial, unregulated grey-market sentiment. It can change quickly or be wrong, and it is not investment advice or a guaranteed listing prediction.** Estimates on the site are simple arithmetic on provider data, not forecasts.

## Features

- **Pages:** overview (`/`), GMP today with a filterable/sortable market board (`/ipo-gmp-today`), upcoming IPOs (`/upcoming-ipos`), per-IPO detail with GMP, metrics, timeline and subscription (`/ipo/[slug]`), and a contact letter (`/contact`).
- **Data:** a pluggable provider layer (IPO Guru API or an opt-in IPO Watch scraper), validated and cached with Next.js ISR. Missing values are shown as "Not available", never as `0`.
- **Subscription:** headline multiples, a day-by-day momentum chart and an exact category matrix (stacked into readable blocks on phones).
- **UI:** glassmorphism design system, light/dark theme with a circular reveal, liquid filter pills, count-up headline numbers, a short opening animation, and one shared motion vocabulary.
- **Mobile:** touch-aware (hover effects only on real hover devices), 44px tap areas, safe-area handling, reduced blur on touch, no horizontal overflow from 320px up.
- **SEO:** per-page metadata, canonical URLs, Open Graph, JSON-LD, sitemap, robots, and `noindex` for thin pages.
- **Accessibility:** semantic links, visible focus, reduced-motion support, contrast checked against WCAG AA.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · framer-motion · cheerio (scraper parsing) · `server-only`. No database and no separate backend.

> This Next.js version differs from older releases. Read the relevant guide in `node_modules/next/dist/docs/` before touching Next APIs (see `AGENTS.md`).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values you need
npm run dev                  # http://localhost:3000
```

### Choosing a data source

The build and the dev server fetch data, so one provider must be configured.

**IPO Guru API (the code default).** Needs a key:

```bash
IPO_DATA_PROVIDER=ipoguru
IPOGURU_API_KEY=your-key
```

**IPO Watch scraper (opt-in, private use only).** No key, but IPO Watch's terms restrict reuse, so use it for development or private deployments only:

```bash
IPO_DATA_PROVIDER=ipowatch
IPO_SCRAPER_ENABLED=true
IPOWATCH_ALLOW_PRODUCTION=true   # only needed for `next build` / `next start`
```

Without either, the build fails with `IPOGURU_API_KEY is not set`. That is intentional: a failed build is better than shipping empty, indexable pages.

### Environment variables

See [`.env.example`](.env.example) for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `IPO_DATA_PROVIDER` | `ipoguru` (default) or `ipowatch` |
| `IPOGURU_API_KEY` | IPO Guru API key (server-only) |
| `IPO_SCRAPER_ENABLED`, `IPOWATCH_ALLOW_PRODUCTION` | opt-ins for the scraper |
| `SITE_URL` | public site URL for canonical links and the sitemap (no trailing slash). Set it in production |
| `RESEND_API_KEY`, `CONTACT_EMAIL`, `EMAIL_FROM` | contact page email delivery via [Resend](https://resend.com). Optional: the page works, but sending fails until set |

Real `.env*` files are git-ignored. Only `.env.example` is committed.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build (needs a data provider configured, see above)
npm run start       # serve the production build
npm test            # 51 node:test unit tests (pure modules, no network)
npm run typecheck   # tsc --noEmit (run a build or `npx next typegen` once on a fresh clone for Next's generated types)
npm run lint        # eslint
```

## Project layout

```
app/                 routes, layouts, loading/error states, sitemap, robots, /api/contact
components/          UI (cards, board, subscription, nav, glass surfaces, contact letter)
components/motion/   shared motion tokens and primitives (Magnetic, Liquid pills, InView)
lib/                 data layer: providers, validation, GMP maths, service, config, contact relay
lib/providers/       IpoGuruProvider and the IPO Watch scraper (ipowatch/)
HANDOVER.md          full engineering handover (architecture, decisions, limitations, next steps)
```

Pages never call providers directly. They go through `lib/ipo-data.ts` and `IpoService`, so a provider can be swapped by implementing one interface.

## Deploying (Vercel)

1. Import the repository.
2. Add environment variables: the provider variables above, plus `SITE_URL` (your deployed URL).
3. Deploy. Pages are statically generated and revalidated every 4 hours.

With the scraper provider, detail pages render on demand instead of at build time. The scraper can be blocked from cloud IPs; if a build fails with a data-source error, see `HANDOVER.md` section 12.

## Data and licensing notes

- **IPO Guru** free plan is non-commercial (10 requests/day, 1/minute). Keep the footer attribution.
- **IPO Watch** terms forbid copying/republishing and limit use to personal, non-commercial purposes. The scraper is behind two explicit opt-ins for that reason.
- Test fixtures are synthetic, not copied site content.

## More

Architecture, provider details, data rules, design and motion system, mobile approach, known limitations and suggested next steps are in [`HANDOVER.md`](HANDOVER.md).
