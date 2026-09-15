import type { MetadataRoute } from "next";
import { createStorefrontClient } from "@asstio/storefront";
import { apiBaseUrl, isRetryable, requiredEnv } from "@/lib/storefront";

const PAGE_SIZE = 500;

/**
 * Rendered on request, not during `next build`. A sitemap that threw would take the whole build down with it,
 * and the likeliest reason to throw — an index being rebuilt, or the API briefly unreachable — is exactly what
 * happens during a deploy.
 */
export const dynamic = "force-dynamic";

/**
 * Every product and every collection, paged out of `/v1/sitemap` — the endpoint exists so a frontend never has
 * to crawl its own listings to know what it publishes. `alternateUrls` becomes `alternates.languages`, which is
 * what emits the hreflang entries.
 *
 * It uses the publishable key directly rather than `lib/storefront`: a sitemap describes what is published,
 * never the draft.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = createStorefrontClient({
    baseUrl: apiBaseUrl(),
    siteKey: requiredEnv("STOREFRONT_SITE_KEY"),
    market: process.env.STOREFRONT_MARKET,
    fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 3600 } }),
  });

  const entries: MetadataRoute.Sitemap = [];
  for (const type of ["product", "collection"] as const) {
    for (let page = 1; ; page++) {
      // A transport failure is as retryable as a 503, and must not take the route down either.
      const result = await api
        .GET("/v1/sitemap", { params: { query: { type, page, pageSize: PAGE_SIZE } } })
        .catch((cause: unknown) => ({ data: undefined, error: undefined, cause }));

      if ("cause" in result) {
        console.warn(`Sitemap: could not reach the Storefront API for ${type}s; serving what we have.`, result.cause);
        return entries;
      }
      if (result.error) {
        // Retryable: a partial sitemap now beats a 500, and the next request rebuilds it.
        if (isRetryable(result.error.code)) {
          console.warn(`Sitemap: ${result.error.code} while listing ${type}s; serving what we have.`);
          return entries;
        }
        throw new Error(`${result.error.code}: ${result.error.detail ?? result.error.title}`);
      }
      if (!result.data) return entries;

      for (const item of result.data.items) {
        entries.push({
          url: item.url,
          lastModified: new Date(item.updatedAt),
          alternates: { languages: item.alternateUrls },
        });
      }
      if (result.data.items.length < PAGE_SIZE || page * PAGE_SIZE >= Number(result.data.total)) break;
    }
  }
  return entries;
}
