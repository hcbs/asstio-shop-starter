import Link from "next/link";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Price } from "@/components/ProductGrid";
import { Rebuilding } from "@/components/Listing";
import { REBUILDING, storefront, unwrap } from "@/lib/storefront";
import type { SearchParams } from "@/lib/urls";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const api = await storefront();
  const result = await api.GET("/v1/products/{slugOrId}", { params: { path: { slugOrId: slug } } });
  const product = result.data;
  if (!product) return {};
  return {
    title: product.seo.title,
    description: product.seo.description ?? undefined,
    alternates: {
      canonical: product.url,
      // One absolute URL per language the product exists in — the API already knows the shop's URL patterns.
      languages: product.alternateUrls,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const api = await storefront();

  const product = unwrap(await api.GET("/v1/products/{slugOrId}", { params: { path: { slugOrId: slug } } }));
  if (product === REBUILDING) return <Rebuilding />;

  // A renamed product answers 200 on its old slug and names the current one: a permanent redirect, so the
  // link equity of the old URL follows it.
  if (product.redirectTo) permanentRedirect(`/p/${product.redirectTo}`);

  const wanted = Array.isArray(sp.variant) ? sp.variant[0] : sp.variant;
  const selected = product.variants.find((variant) => variant.id === wanted) ?? product.variants[0];

  return (
    <main>
      <h1>{product.name}</h1>
      <p>Art.nr {product.sku}</p>

      {product.options.map((option) => (
        <p key={option.name}>
          {option.name}: {option.values.join(", ")}
        </p>
      ))}

      <h2>Varianter</h2>
      <ul>
        {product.variants.map((variant) => (
          <li key={variant.id}>
            <Link href={`/p/${product.slug}?variant=${encodeURIComponent(variant.id)}`} rel="nofollow">
              {Object.entries(variant.selectedOptions)
                .map(([name, value]) => `${name} ${value}`)
                .join(" · ") || variant.sku}
            </Link>{" "}
            <Price price={variant.price} /> {variant.inStock ? `· ${variant.stock} i lager` : "· slut"}
            {variant.id === selected?.id && " ← vald"}
          </li>
        ))}
      </ul>

      {selected && (
        <p>
          Valt: {selected.sku} — <Price price={selected.price} />
        </p>
      )}

      {product.categories.length > 0 && (
        <>
          <h2>Kategorier</h2>
          <ul>
            {product.categories.map((category) => (
              <li key={category.id}>{category.pathNames.join(" › ")}</li>
            ))}
          </ul>
        </>
      )}

      {product.collections.length > 0 && (
        <>
          <h2>Finns i</h2>
          <ul>
            {product.collections.map((collection) => (
              <li key={collection.id}>
                <Link href={`/k/${collection.path}`}>{collection.name}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
