import type { GmpPoint, GmpSnapshot, Ipo, SubscriptionData } from "../types";

export interface IpoListResult {
  ipos: Ipo[];
  /** When the provider data was fetched (ISO-8601 UTC). */
  fetchedAt: string;
}

export interface GmpData {
  current: GmpSnapshot | null;
  /** Newest first. Empty when the provider has no history. */
  history: GmpPoint[];
}

/** Which optional operations a provider can serve. The service never calls an unsupported one. */
export interface ProviderCapabilities {
  details: boolean;
  gmpHistory: boolean;
  subscription: boolean;
}

/**
 * Everything the application knows about IPO data providers. The rest of the app must depend on this
 * interface only (never on a concrete provider), so IPO Watch can be swapped for IPO Guru via config.
 *
 * Contract: methods return null for "not available"; they may throw ProviderError when the source is
 * unreachable. Provider-specific errors must not leak past the service layer.
 */
export interface IpoDataProvider {
  /** Display name for attribution, e.g. "IPO Guru". */
  readonly name: string;
  readonly url: string;
  readonly capabilities: ProviderCapabilities;
  /** Calendar of upcoming/open/recent IPOs, including current GMP and overall subscription where known. */
  fetchUpcomingIpos(): Promise<IpoListResult>;
  fetchIpoDetails(slug: string): Promise<Ipo | null>;
  fetchGmp(slug: string): Promise<GmpData | null>;
  fetchSubscription(slug: string): Promise<SubscriptionData | null>;
}

export class ProviderError extends Error {
  readonly kind: "unavailable" | "blocked" | "parse" | "config";
  constructor(kind: ProviderError["kind"], message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}
