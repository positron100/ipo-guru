import type { Ipo } from "./types";
import { resolveStatus, istToday } from "./ipoguru-normalize.ts";
import type { IpoDataProvider } from "./providers/types.ts";
import { validateIpo } from "./providers/validate.ts";

export interface IpoList { ipos: Ipo[]; fetchedAt: string }

interface Logger {
  warn(msg: string, ...rest: unknown[]): void;
}

/** Field-wise merge: a non-null value from `extra` fills or overrides `base`; nulls never erase known data. */
export function mergeIpo(base: Ipo, extra: Ipo): Ipo {
  const pick = <T>(a: T | null, b: T | null): T | null => (b !== null && b !== undefined ? b : a);
  const dates = {
    open: pick(base.dates.open, extra.dates.open), close: pick(base.dates.close, extra.dates.close),
    allotment: pick(base.dates.allotment, extra.dates.allotment), refund: pick(base.dates.refund, extra.dates.refund),
    demat: pick(base.dates.demat, extra.dates.demat), listing: pick(base.dates.listing, extra.dates.listing),
  };
  return {
    ...base,
    board: pick(base.board, extra.board),
    priceBand: extra.priceBand.max !== null ? extra.priceBand : base.priceBand,
    issueSizeCr: pick(base.issueSizeCr, extra.issueSizeCr),
    freshIssueCr: pick(base.freshIssueCr, extra.freshIssueCr),
    offerForSale: pick(base.offerForSale, extra.offerForSale),
    lotSize: pick(base.lotSize, extra.lotSize),
    listingExchange: pick(base.listingExchange, extra.listingExchange),
    dates,
    status: resolveStatus(base.status, base.status === "listed", dates, istToday()),
  };
}

/**
 * Application-facing IPO data. Depends only on IpoDataProvider. The provider's own HTTP layer caches responses
 * (Next data cache), so frontends reading this service never trigger upstream requests per visitor.
 * Failure policy: the list is required (throws if the provider cannot supply one); every per-IPO enrichment is
 * best-effort, so one failing page never stops the rest.
 */
export class IpoService {
  private readonly provider: IpoDataProvider;
  private readonly log: Logger;

  constructor(provider: IpoDataProvider, logger: Logger = console) {
    this.provider = provider;
    this.log = logger;
  }

  /** Attribution plus whether detail pages need extra provider requests beyond the list. */
  get source(): { name: string; url: string; enriched: boolean } {
    const c = this.provider.capabilities;
    return { name: this.provider.name, url: this.provider.url, enriched: c.details || c.gmpHistory || c.subscription };
  }

  /** Validated, de-duplicated (by slug) IPO list. Invalid values are nulled with a warning, never fatal. */
  async list(): Promise<IpoList> {
    const { ipos, fetchedAt } = await this.provider.fetchUpcomingIpos();
    const bySlug = new Map<string, Ipo>();
    for (const raw of ipos) {
      try {
        const { ipo, warnings } = validateIpo(raw);
        for (const w of warnings) this.log.warn(`[ipo] ${w}`);
        bySlug.set(ipo.slug, ipo); // last record for a slug wins: no duplicates
      } catch (e) {
        this.log.warn(`[ipo] skipping ${raw.slug}:`, e instanceof Error ? e.message : e);
      }
    }
    return { ipos: [...bySlug.values()], fetchedAt };
  }

  async get(slug: string): Promise<{ ipo: Ipo; fetchedAt: string } | null> {
    const { ipos, fetchedAt } = await this.list();
    const ipo = ipos.find((i) => i.slug === slug);
    return ipo ? { ipo, fetchedAt } : null;
  }

  /** List data plus whatever the provider can add for one IPO (details, GMP history, category-wise subscription). */
  async getDetail(slug: string): Promise<{ ipo: Ipo; fetchedAt: string } | null> {
    const found = await this.get(slug);
    if (!found) return null;
    const caps = this.provider.capabilities;
    const [details, gmp, subscription] = await Promise.allSettled([
      caps.details ? this.provider.fetchIpoDetails(slug) : Promise.resolve(null),
      caps.gmpHistory ? this.provider.fetchGmp(slug) : Promise.resolve(null),
      caps.subscription ? this.provider.fetchSubscription(slug) : Promise.resolve(null),
    ]);
    let ipo = found.ipo;
    const ok = <T>(r: PromiseSettledResult<T>, what: string): T | null => {
      if (r.status === "fulfilled") return r.value;
      this.log.warn(`[ipo] ${slug}: ${what} unavailable:`, r.reason instanceof Error ? r.reason.message : r.reason);
      return null;
    };
    const d = ok(details, "details");
    if (d) ipo = mergeIpo(ipo, d);
    const g = ok(gmp, "GMP");
    if (g) {
      // The per-IPO page carries timestamped readings, so its latest one beats a listing value without a time.
      ipo = { ...ipo, history: g.history, gmp: g.current ?? ipo.gmp };
    }
    const s = ok(subscription, "subscription");
    if (s) ipo = { ...ipo, subscription: { ...s, updatedAtLabel: s.updatedAtLabel ?? ipo.subscription?.updatedAtLabel ?? null } };
    const { ipo: validated, warnings } = validateIpo(ipo);
    for (const w of warnings) this.log.warn(`[ipo] ${w}`);
    return { ipo: validated, fetchedAt: found.fetchedAt };
  }
}
