import Link from "next/link";
import type { components } from "@asstio/storefront";
import { withParam, type SearchParams } from "@/lib/urls";
import { Facets } from "./Facets";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";

type ListingResponse = components["schemas"]["ListingResponse"];

/** Facets + sort + cards + paging: identical on the search screen and on a collection, so it lives once. */
export function Listing({
  pathname,
  searchParams,
  listing,
}: {
  pathname: string;
  searchParams: SearchParams;
  listing: ListingResponse;
}) {
  return (
    <div>
      {/* A near-miss query still answers 200 and says what it ignored, so the page says so too instead of
          silently showing something else than what was asked for. */}
      {listing.warnings.length > 0 && (
        <ul>
          {listing.warnings.map((warning) => (
            <li key={`${warning.code}:${warning.message}`}>
              {warning.code}: {warning.message}
            </li>
          ))}
        </ul>
      )}
      {listing.queryCorrection && <p>Visar resultat för “{listing.queryCorrection}”.</p>}

      <Facets
        pathname={pathname}
        searchParams={searchParams}
        facets={listing.facets}
        appliedFilters={listing.appliedFilters}
      />

      <div>
        <p>{String(listing.total)} produkter</p>
        <nav>
          Sortera:{" "}
          {listing.sort.available.map((option) => (
            <span key={option.key}>
              {option.key === listing.sort.selected ? (
                <strong>{option.label}</strong>
              ) : (
                <Link href={withParam(pathname, searchParams, "sort", option.key)} rel="nofollow">
                  {option.label}
                </Link>
              )}{" "}
            </span>
          ))}
        </nav>
        <ProductGrid items={listing.items} />
        <Pagination
          pathname={pathname}
          searchParams={searchParams}
          page={listing.page}
          pageSize={listing.pageSize}
          total={listing.total}
        />
      </div>
    </div>
  );
}

/** A search box that keeps the filters already in the URL. */
export function SearchForm({ pathname, searchParams }: { pathname: string; searchParams: SearchParams }) {
  const q = searchParams.q;
  return (
    <form action={pathname} method="get">
      <input type="search" name="q" defaultValue={Array.isArray(q) ? q[0] : (q ?? "")} placeholder="Sök" />
      <button type="submit">Sök</button>
    </form>
  );
}

/** 503 INDEX_UNAVAILABLE: a preview index is being rebuilt. Retrying is the fix, so say that and stay up. */
export function Rebuilding() {
  return (
    <main>
      <h1>Indexet byggs om</h1>
      <p>Sökindexet för den här vyn byggs just nu om. Ladda om sidan om en liten stund.</p>
    </main>
  );
}
