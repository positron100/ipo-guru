import type { MetadataRoute } from "next";
import { getAllIpos } from "@/lib/ipo-data";
import { isThin } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const revalidate = 14400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const fixed: MetadataRoute.Sitemap = ["", "/ipo-gmp-today", "/upcoming-ipos", "/contact"].map((p) => ({ url: `${base}${p}` }));
  try {
    const { ipos } = await getAllIpos();
    return [
      ...fixed,
      ...ipos.filter((i) => !isThin(i)).map((i) => ({ url: `${base}/ipo/${i.slug}`, lastModified: i.gmp?.updatedAt ? new Date(i.gmp.updatedAt) : undefined })),
    ];
  } catch {
    return fixed; // upstream down: still serve a valid sitemap
  }
}
