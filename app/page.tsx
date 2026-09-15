import Link from "next/link";
import type { components } from "@asstio/storefront";
import { Listing, Rebuilding, SearchForm } from "@/components/Listing";
import { listingQuery, REBUILDING, storefront, unwrap } from "@/lib/storefront";
import type { SearchParams } from "@/lib/urls";

type Collection = components["schemas"]["CollectionDto"];

/** Start page: who this site is, the collection tree, and — when `?q=` is set — the search results. */
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const api = await storefront();

  const site = unwrap(await api.GET("/v1/site", {}));
  const collections = unwrap(await api.GET("/v1/collections", {}));
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const listing = q ? unwrap(await api.GET("/v1/products", { params: { query: listingQuery(sp) } })) : null;

  if (site === REBUILDING || collections === REBUILDING || listing === REBUILDING) return <Rebuilding />;

  return (
    <main>
      <h1>{site.name}</h1>
      <p>
        Marknad {site.defaultMarket} · konfigurationsversion {site.configVersion}
        {site.preview && " · förhandsvisning"}
      </p>

      <SearchForm pathname="/" searchParams={sp} />

      <h2>Kategorier</h2>
      <CollectionTree collections={collections} path="" />

      {listing && (
        <>
          <h2>Sökresultat för “{q}”</h2>
          <Listing pathname="/" searchParams={sp} listing={listing} />
        </>
      )}
    </main>
  );
}

function CollectionTree({ collections, path }: { collections: Collection[]; path: string }) {
  if (collections.length === 0) return <p>Inga kategorier.</p>;
  return (
    <ul>
      {collections.map((collection) => {
        const href = path ? `${path}/${collection.slug}` : collection.slug;
        return (
          <li key={collection.id}>
            <Link href={`/k/${href}`}>{collection.name}</Link>
            {collection.children.length > 0 && <CollectionTree collections={collection.children} path={href} />}
          </li>
        );
      })}
    </ul>
  );
}
