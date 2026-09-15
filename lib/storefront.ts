import { createStorefrontClient, filterQuery, type components, type paths } from "@asstio/storefront";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import type { SearchParams } from "./urls";
import { facetSelection } from "./urls";

type Problem = components["schemas"]["StorefrontProblem"];
type Sort = NonNullable<NonNullable<paths["/v1/products"]["get"]["parameters"]["query"]>["sort"]>;

/**
 * A client for this request. In draft mode it sends the preview key, which is why every call happens on the
 * server: the preview key must never reach a browser bundle, and neither must a secret key.
 */
export async function storefront() {
  const { isEnabled } = await draftMode();
  const siteKey = requiredEnv(isEnabled ? "STOREFRONT_PREVIEW_KEY" : "STOREFRONT_SITE_KEY");
  return createStorefrontClient({
    baseUrl: apiBaseUrl(),
    siteKey,
    market: process.env.STOREFRONT_MARKET,
    // Draft content changes while you look at it, so it is never cached; published content is revalidated.
    fetch: (input, init) => fetch(input, { ...init, next: { revalidate: isEnabled ? 0 : 60 } }),
  });
}

export const apiBaseUrl = () => process.env.STOREFRONT_API_URL ?? "http://localhost:5041";

/** An environment variable that has to be there, with a message that says which one — never a bare `!`. */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set (see .env.example).`);
  return value;
}

/** Codes the API means as "ask again shortly": a warming registry, or an index mid-rebuild. */
export const isRetryable = (code: string) => code === "INDEX_UNAVAILABLE" || code === "SITE_REGISTRY_WARMING";

/** The API answers 503 INDEX_UNAVAILABLE while an index is rebuilt — a retry, not a failure of the page. */
export const REBUILDING = Symbol("index rebuilding");
export type Loaded<T> = T | typeof REBUILDING;

/**
 * The single place this app interprets a Storefront error: the entity 404s become Next's notFound(), an index
 * being rebuilt becomes a retry page, and anything else is a real fault and throws. Branching on `code` and
 * never on the status alone is what the API asks of a client.
 */
export function unwrap<T>(result: { data?: T; error?: Problem }): Loaded<T> {
  if (result.error) {
    const { code } = result.error;
    if (code === "PRODUCT_NOT_FOUND" || code === "COLLECTION_NOT_FOUND" || code === "NOT_FOUND") notFound();
    if (isRetryable(code)) return REBUILDING;
    throw new Error(`${code}: ${result.error.detail ?? result.error.title}`);
  }
  if (result.data === undefined) throw new Error("The Storefront API returned neither data nor a problem.");
  return result.data;
}

/**
 * Listing query string → API query. `filter[<key>]` carries the facet selection, so a listing URL is buildable
 * from a facet response alone and this function needs to know no facet key.
 */
export function listingQuery(sp: SearchParams) {
  const q = first(sp.q);
  // The contract enumerates the sorts, but this one comes out of a URL a visitor can type. The API answers an
  // unknown sort with 200 and a SORT_UNKNOWN warning rather than an error, and the listing renders that warning,
  // so passing it through unvalidated is the behaviour we want — hence the cast.
  const sort = first(sp.sort) as Sort;
  const page = Number(first(sp.page) ?? "1");
  return {
    ...(q ? { q } : {}),
    ...(sort ? { sort } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    filter: filterQuery(facetSelection(sp)),
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
