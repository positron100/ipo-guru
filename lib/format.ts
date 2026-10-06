const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
export const rupee = (v: number | null) => (v === null ? null : `₹${inr.format(v)}`);
export const pct = (v: number | null) => (v === null ? null : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
export const signedRupee = (v: number | null) =>
  v === null ? null : `${v > 0 ? "+" : v < 0 ? "−" : ""}₹${inr.format(Math.abs(v))}`;
export const crore = (v: number | null) => (v === null ? null : `₹${inr.format(v)} Cr`);
export const times = (v: number | null) => (v === null ? null : `${v.toFixed(2)}x`);

/** Exchange dates arrive as midnight UTC representing an IST calendar day; format in UTC to avoid a day shift. */
export const dateOnly = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : null;

export const dateTimeIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }) + " IST";

export const shortIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) + " IST";

export const NA = "Not available";

/** Compact "30 Sep" form for tight spaces (cards); same UTC-day handling as dateOnly. */
export const dayMonth = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }) : null;
