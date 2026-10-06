import type { Ipo } from "./types";
import { deriveIpo } from "./gmp";

/** Flat, serialisable view of an IPO for the market board (presentation only; all values come from the Ipo model). */
export interface Row {
  slug: string; name: string; board: string | null; status: string;
  priceMin: number | null; priceMax: number | null; lotSize: number | null; issueSizeCr: number | null; minInvestment: number | null;
  gmp: number | null; gmpPct: number | null; estPrice: number | null;
  open: string | null; close: string | null; listing: string | null; gmpUpdatedAt: string | null; mismatch: boolean;
}

export const toRow = (i: Ipo): Row => {
  const d = deriveIpo(i);
  return {
    slug: i.slug, name: i.name, board: i.board, status: i.status,
    priceMin: i.priceBand.min, priceMax: i.priceBand.max, lotSize: i.lotSize, issueSizeCr: i.issueSizeCr, minInvestment: d.minInvestment,
    gmp: i.gmp?.value ?? null, gmpPct: d.estGainPct, estPrice: d.estListingPrice,
    open: i.dates.open, close: i.dates.close, listing: i.dates.listing, gmpUpdatedAt: i.gmp?.updatedAt ?? null, mismatch: d.pctMismatch,
  };
};
