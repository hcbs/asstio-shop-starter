# asstio-shop-starter

A reference storefront on the [Asstio Storefront API](https://api.storefront.asstio.com). Four screens, no
design, no shop-specific logic: fork it and build your shop on top, or read it to see what the API expects of a
frontend.

It is deliberately plain HTML. Everything here is the *contract*, not the design — anything that looked like a
design system would be the first thing you deleted.

## Run it

```bash
npm install --install-links
cp .env.example .env.local     # fill in the API URL and your keys
npm run dev                    # http://localhost:3000
```

The SDK is a `file:` dependency on a sibling checkout, and `npm install --install-links` copies it into
`node_modules` instead of symlinking it — Turbopack does not resolve a symlink that points outside the project
root. Re-run it after rebuilding the SDK. This goes away when `@asstio/storefront` is published.

Against a local backend, run the storefront backend's dev stack and seed first — it prints the keys to paste
into `.env.local`:

```bash
cd ../asstio-storefront
docker compose -f docker-compose.dev.yml up -d
dotnet run --project tools/Storefront.DevSeed
dotnet run --project src/Storefront.Api      # http://localhost:5041
```

## What is where

| Path | |
| --- | --- |
| `app/page.tsx` | Start: site name, collection tree, search (`/?q=…`) |
| `app/k/[...path]/page.tsx` | Collection: breadcrumb, children, facets, products, paging |
| `app/p/[slug]/page.tsx` | Product: variants, prices, categories, the collections it is in |
| `app/sitemap.ts` | `/sitemap.xml`, paged out of `/v1/sitemap`, with hreflang alternates |
| `app/api/draft/route.ts` | Draft mode on (and `…/disable` off) |
| `lib/storefront.ts` | The API client, error handling, query string → API query |
| `lib/urls.ts` | Query-string arithmetic: toggling a facet, sort, paging |
| `components/` | Facets, product grid, pagination, the shared listing |

## The three things worth copying

**Facets are rendered from the response, never from a list of names.** `components/Facets.tsx` branches on
`facet.type` (`list`, `swatch`, `hierarchy`, `range`, `toggle`) and `facet.match`, and contains no facet key at
all. A shop that adds a "colour" facet in Asstio gets a working filter here with no frontend change. Grepping
this repo for a facet name from your own shop should find nothing.

**Every error is read from `code`, never from the status.** `unwrap()` in `lib/storefront.ts` is the only place
that interprets a failure: `PRODUCT_NOT_FOUND`/`COLLECTION_NOT_FOUND` become Next's `notFound()`,
`INDEX_UNAVAILABLE` and `SITE_REGISTRY_WARMING` are retries and render a "rebuilding" page instead of crashing,
and anything else is a genuine fault and throws. A listing with a bad `sort` or an unknown filter answers 200
with `warnings[]`, and the page shows them rather than going blank.

**A renamed product keeps its old URL working.** `/v1/products/{slug}` answers 200 with `redirectTo` when the
slug is historical, and the product page turns that into a `permanentRedirect`.

## Keys

| Variable | |
| --- | --- |
| `STOREFRONT_SITE_KEY` | `sfk_pub_…`, publishable — safe in a browser bundle |
| `STOREFRONT_PREVIEW_KEY` | `sfk_prv_…`, draft content — **server only** |
| `STOREFRONT_DRAFT_SECRET` | your own secret, required by `/api/draft?secret=…` |

Every API call in this app happens on the server, so no key reaches the browser. A `sfk_sec_…` secret key
belongs to server-to-server integrations and is rejected outright if it arrives from a page; never put one
here, and never prefix any of these `NEXT_PUBLIC_`.

Draft mode: `http://localhost:3000/api/draft?secret=…&redirect=/k/dam` sets the cookie that makes every server
render use the preview key; the banner in the layout links back out of it.

## The types

`@asstio/storefront` is the SDK: an `openapi-fetch` client that sets `X-Site-Key`, `X-Market` and
`Accept-Language`, plus types generated from the API's committed OpenAPI document. Here it is installed as a
`file:` dependency on a checkout of the backend until the package is published.
