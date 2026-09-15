import Link from "next/link";
import type { Metadata } from "next";
import { Listing, Rebuilding, SearchForm } from "@/components/Listing";
import { listingQuery, REBUILDING, storefront, unwrap } from "@/lib/storefront";
import type { SearchParams } from "@/lib/urls";

type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<SearchParams> };

/** The API addresses a collection by its own slug or id, so only the last segment of the path identifies it. */
const identify = (path: string[]) => path[path.length - 1];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const api = await storefront();
  const result = await api.GET("/v1/collections/{slugOrId}", {
    params: { path: { slugOrId: identify(path) } },
  });
  return { title: result.data?.collection.name ?? "Kategori" };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { path } = await params;
  const sp = await searchParams;
  const pathname = `/k/${path.join("/")}`;

  const api = await storefront();
  const page = unwrap(
    await api.GET("/v1/collections/{slugOrId}", {
      params: { path: { slugOrId: identify(path) }, query: listingQuery(sp) },
    }),
  );
  if (page === REBUILDING) return <Rebuilding />;

  return (
    <main>
      <nav>
        {page.breadcrumb.map((crumb) => (
          <span key={crumb.id}>
            <Link href={`/k/${crumb.path}`}>{crumb.name}</Link> /{" "}
          </span>
        ))}
      </nav>
      <h1>{page.collection.name}</h1>

      {page.collection.children.length > 0 && (
        <ul>
          {page.collection.children.map((child) => (
            <li key={child.id}>
              <Link href={`/k/${child.path}`}>{child.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <SearchForm pathname={pathname} searchParams={sp} />
      <Listing pathname={pathname} searchParams={sp} listing={page.listing} />
    </main>
  );
}
