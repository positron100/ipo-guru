import type { Derived, Ipo } from "./types";

const num = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** All outputs are null when any input is unknown. Missing GMP is never treated as 0. */
export function derive(
  priceMax: number | null,
  lotSize: number | null,
  gmp: number | null,
  providerPct: number | null = null,
): Derived {
  const okPrice = num(priceMax) && priceMax > 0;
  const estGainPct = okPrice && num(gmp) ? (gmp / priceMax) * 100 : null;
  return {
    minInvestment: okPrice && num(lotSize) ? priceMax * lotSize : null,
    estListingPrice: okPrice && num(gmp) ? priceMax + gmp : null,
    estGainPct,
    gainPerLot: num(gmp) && num(lotSize) ? gmp * lotSize : null,
    pctMismatch:
      estGainPct !== null && num(providerPct) && Math.abs(estGainPct - providerPct) > 1,
  };
}

export const deriveIpo = (i: Ipo): Derived =>
  derive(i.priceBand.max, i.lotSize, i.gmp?.value ?? null, i.gmp?.providerPct ?? null);

export function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const d = derive(100, 150, 25);
  assert(d.estListingPrice === 125 && d.estGainPct === 25 && d.gainPerLot === 3750 && d.minInvestment === 15000, "basic");
  const z = derive(100, 150, 0);
  assert(z.estListingPrice === 100 && z.estGainPct === 0 && z.gainPerLot === 0, "zero gmp is a real value");
  const n = derive(100, 150, null);
  assert(n.estListingPrice === null && n.estGainPct === null && n.gainPerLot === null && n.minInvestment === 15000, "null gmp stays null");
  const np = derive(null, 150, 10);
  assert(np.estListingPrice === null && np.minInvestment === null && np.gainPerLot === 1500, "null price");
  assert(derive(0, 10, 5).estGainPct === null, "zero price guard");
  assert(derive(100, 1, -10).estGainPct === -10, "negative gmp");
  assert(derive(100, 1, 10, 67).pctMismatch === true && derive(100, 1, 10, 10.2).pctMismatch === false, "mismatch");
}
