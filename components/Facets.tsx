import Link from "next/link";
import type { components } from "@asstio/storefront";
import { hiddenFields, selectedValues, toggleFacet, withFacet, withoutFilters, type SearchParams } from "@/lib/urls";

type Facet = components["schemas"]["FacetDto"];
type FacetValue = components["schemas"]["FacetValueDto"];
type AppliedFilter = components["schemas"]["AppliedFilterDto"];

/**
 * Every facet the API returned, rendered from its own `type` — `list`, `swatch`, `hierarchy`, `range`, `toggle`.
 * There is deliberately no facet key anywhere in this file: a shop that adds a "colour" facet in Asstio gets a
 * working filter here with no frontend change, which is the whole point of the facet contract.
 */
export function Facets({
  pathname,
  searchParams,
  facets,
  appliedFilters,
}: {
  pathname: string;
  searchParams: SearchParams;
  facets: Facet[];
  appliedFilters: AppliedFilter[];
}) {
  if (facets.length === 0 && appliedFilters.length === 0) return null;
  return (
    <aside>
      {appliedFilters.length > 0 && (
        <div>
          <h3>Valt</h3>
          <ul>
            {appliedFilters.map((applied) => (
              <li key={`${applied.facet}:${applied.value}`}>
                {/* The chip removes the value with the facet's own match semantics — a "single" facet clears,
                    a multi-select drops just this value — looked up rather than assumed. */}
                <Link
                  href={toggleFacet(
                    pathname,
                    searchParams,
                    applied.facet,
                    applied.value,
                    facets.find((facet) => facet.key === applied.facet)?.match ?? "any",
                  )}
                  rel="nofollow"
                >
                  {applied.label} ✕
                </Link>
              </li>
            ))}
          </ul>
          <Link href={withoutFilters(pathname, searchParams)} rel="nofollow">
            Rensa allt
          </Link>
        </div>
      )}

      {facets.map((facet) => (
        <section key={facet.key}>
          <h3>{facet.label}</h3>
          {facet.type === "range" && facet.range ? (
            <RangeFacet pathname={pathname} searchParams={searchParams} facet={facet} range={facet.range} />
          ) : (
            <ValueList pathname={pathname} searchParams={searchParams} facet={facet} values={facet.values} />
          )}
          {facet.truncated && <p>Fler värden finns än de som visas.</p>}
        </section>
      ))}
    </aside>
  );
}

/** `list`, `swatch` and `toggle` are all "click a value"; `hierarchy` is the same with children under each. */
function ValueList({
  pathname,
  searchParams,
  facet,
  values,
}: {
  pathname: string;
  searchParams: SearchParams;
  facet: Facet;
  values: FacetValue[];
}) {
  if (values.length === 0) return null;
  return (
    <ul>
      {values.map((value) => (
        <li key={value.key}>
          <Link href={toggleFacet(pathname, searchParams, facet.key, value.key, facet.match)} rel="nofollow">
            <span aria-hidden="true">{value.selected ? "☑" : "☐"}</span>{" "}
            {value.swatch?.color && (
              <span
                aria-hidden="true"
                style={{ background: value.swatch.color, display: "inline-block", width: "1em", height: "1em" }}
              />
            )}
            {value.swatch?.imageUrl && <img src={value.swatch.imageUrl} alt="" width={16} height={16} />}
            {value.label} ({String(value.count)})
          </Link>
          {value.children && value.children.length > 0 && (
            <ValueList pathname={pathname} searchParams={searchParams} facet={facet} values={value.children} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Two number inputs in a plain GET form. They are named after the facet, and `lib/urls` folds
 * `rangeMin[key]`/`rangeMax[key]` back into `filter[key]=min-max`, so this works without JavaScript.
 */
function RangeFacet({
  pathname,
  searchParams,
  facet,
  range,
}: {
  pathname: string;
  searchParams: SearchParams;
  facet: Facet;
  // Passed in rather than read off `facet`, so the caller's null check is what the type says, not a `!` here.
  range: NonNullable<Facet["range"]>;
}) {
  const selected = range.selected;
  const applied = selectedValues(searchParams, facet.key).length > 0;
  return (
    <form action={pathname} method="get">
      {hiddenFields(searchParams, [`rangeMin[${facet.key}]`, `rangeMax[${facet.key}]`, `filter[${facet.key}]`]).map(
        (field, i) => (
          <input key={`${field.name}-${i}`} type="hidden" name={field.name} value={field.value} />
        ),
      )}
      <label>
        Från
        <input
          type="number"
          name={`rangeMin[${facet.key}]`}
          step="any"
          placeholder={range.min}
          defaultValue={selected?.min ?? ""}
        />
      </label>
      <label>
        Till
        <input
          type="number"
          name={`rangeMax[${facet.key}]`}
          step="any"
          placeholder={range.max}
          defaultValue={selected?.max ?? ""}
        />
      </label>
      {range.currency && <span>{range.currency}</span>}
      {range.unit && <span>{range.unit}</span>}
      <button type="submit">Filtrera</button>
      {applied && (
        <Link href={withFacet(pathname, searchParams, facet.key, [])} rel="nofollow">
          Rensa
        </Link>
      )}
    </form>
  );
}
