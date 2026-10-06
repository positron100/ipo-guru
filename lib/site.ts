export const SITE_NAME = "IPO GMP Desk";
export const siteUrl = (): string => {
  const u = process.env.SITE_URL;
  if (!u && process.env.NODE_ENV === "production") console.warn("[site] SITE_URL is not set; canonical/sitemap URLs will use localhost");
  return (u ?? "http://localhost:3000").replace(/\/+$/, "");
};
