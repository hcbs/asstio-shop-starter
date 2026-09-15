import type { MetadataRoute } from "next";
import { createStorefrontClient } from "@asstio/storefront";

const PAGE_SIZE = 500;

/**
 * Every product and every collection, paged out of `/v1/sitemap` — the endpoint exists so a frontend never has
 * to crawl its own listings to know what it publishes. `alternateUrls` becomes `alternates.languages`, which is
 * what emits the hreflang entries.
 *
 * This runs at build time, so it uses the publishable key directly rather than `lib/storefront`: a sitemap
 * describes what is published, never the draft.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = createStorefrontClient({
    baseUrl: process.env.STOREFRONT_API_URL ?? "http://localhost:5041",
    siteKey: process.env.STOREFRONT_SITE_KEY!,
    market: process.env.STOREFRONT_MARKET,
  });

  const entries: MetadataRoute.Sitemap = [];
  for (const type of ["product", "collection"] as const) {
    for (let page = 1; ; page++) {
      const { data, error } = await api.GET("/v1/sitemap", {
        params: { query: { type, page, pageSize: PAGE_SIZE } },
      });
      if (error) throw new Error(`${error.code}: ${error.detail ?? error.title}`);
      for (const item of data.items) {
        entries.push({
          url: item.url,
          lastModified: new Date(item.updatedAt),
          alternates: { languages: item.alternateUrls },
        });
      }
      if (data.items.length < PAGE_SIZE || page * PAGE_SIZE >= Number(data.total)) break;
    }
  }
  return entries;
}
