export type IpoStatus = "upcoming" | "open" | "closed" | "listed";
export type Board = "MAINBOARD" | "SME";

export interface Ipo {
  slug: string;
  name: string;
  /** ipoType: Mainboard or SME. */
  board: Board | null;
  status: IpoStatus;
  priceBand: { min: number | null; max: number | null };
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  /** Offer for sale; providers quote it in crores or shares, so keep the raw text and a parsed crore value when present. */
  offerForSale: { raw: string; cr: number | null } | null;
  lotSize: number | null;
  listingExchange: string | null;
  /** Calendar dates as YYYY-MM-DD (IST days). */
  dates: {
    open: string | null;
    close: string | null;
    allotment: string | null;
    refund: string | null;
    demat: string | null;
    listing: string | null;
  };
  /** null = unknown. A real "0" reading is { value: 0 }. */
  gmp: GmpSnapshot | null;
  listing: { issuePrice: number | null; listingPrice: number | null; gainPct: number | null };
  subscriptionTotalX: number | null;
  /** Category-wise subscription, when the provider has it. Values are "times subscribed" (e.g. 12.34 = 12.34x). */
  subscription?: SubscriptionData;
  /** Day-wise GMP history, when the provider has it (IPO Watch scraper; IPO Guru Standard plan). */
  history?: GmpPoint[];
}

export interface GmpSnapshot {
  value: number; // ₹ per share
  providerPct: number | null;
  /** When the provider says it was updated (UTC ISO-8601). null = unknown. */
  updatedAt: string | null;
  /** Provider that reported it, for attribution. GMP is never an official exchange value. */
  source?: string;
}

export interface GmpPoint {
  observedAt: string;
  gmp: number;
  providerPct: number | null;
  source?: string;
}

/** Normalized category keys: qib, nii, bnii, snii, retail, employee, shareholder, anchor, others, total; unknown labels are slugified. */
export interface SubscriptionDay {
  day: number | null;
  label: string;
  categories: Record<string, number | null>;
}

export interface SubscriptionData {
  days: SubscriptionDay[];
  /** Most recent known values per category. */
  latest: Record<string, number | null>;
  /** Provider's own "last updated" text (e.g. "17:37" IST), when given. */
  updatedAtLabel: string | null;
}

export interface Derived {
  minInvestment: number | null;
  estListingPrice: number | null;
  estGainPct: number | null;
  gainPerLot: number | null;
  pctMismatch: boolean;
}
