import Link from "next/link";
import type { components } from "@asstio/storefront";

type ProductCard = components["schemas"]["ProductCardDto"];

/** The cards of a listing. Links go to this app's own product route, not to the API's absolute `url`. */
export function ProductGrid({ items }: { items: ProductCard[] }) {
  if (items.length === 0) return <p>Inga produkter matchade.</p>;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/p/${item.slug}`}>{item.name}</Link>
          <div>
            <Price price={item.price} varies={item.priceVaries} />
            {!item.inStock && <span> · Slut i lager</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** `price: null` means the product is not sellable on this market — a real state, not missing data. */
export function Price({
  price,
  varies = false,
}: {
  price: components["schemas"]["PriceDto"] | null;
  varies?: boolean;
}) {
  if (!price) return <span>Säljs inte här</span>;
  return (
    <span>
      {varies && "från "}
      {price.amount} {price.currency}
      {price.compareAt && (
        <>
          {" "}
          <s>
            {price.compareAt} {price.currency}
          </s>
        </>
      )}
      {price.vatIncluded ? " ink." : " exk."} moms
    </span>
  );
}
