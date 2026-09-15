/**
 * Query-string arithmetic for listing pages. Everything here is generic: a facet key is a string that came out
 * of the API, never a name this app knows.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The `filter[<key>]=a,b` parameters of a URL, as the API's own filter object.
 *
 * `rangeMin[<key>]` / `rangeMax[<key>]` fold into `filter[<key>]=min-max` on the way. That pair only exists so a
 * range facet can be two plain number inputs in a GET form — no JavaScript, and still no facet key in the code:
 * the form names them after whichever facet the API said was a range.
 */
export function facetSelection(sp: SearchParams): Record<string, string> {
  const selection: Record<string, string> = {};
  const bounds: Record<string, { min?: string; max?: string }> = {};
  for (const [key, value] of Object.entries(sp)) {
    const single = (Array.isArray(value) ? value[0] : value)?.trim();
    if (!single) continue;
    const filter = /^filter\[(.+)]$/.exec(key);
    if (filter) selection[filter[1]] = single;
    const min = /^rangeMin\[(.+)]$/.exec(key);
    if (min) (bounds[min[1]] ??= {}).min = single;
    const max = /^rangeMax\[(.+)]$/.exec(key);
    if (max) (bounds[max[1]] ??= {}).max = single;
  }
  for (const [key, { min, max }] of Object.entries(bounds)) selection[key] = `${min ?? ""}-${max ?? ""}`;
  return selection;
}

/** The values currently selected for one facet. */
export function selectedValues(sp: SearchParams, facetKey: string): string[] {
  const raw = facetSelection(sp)[facetKey];
  return raw ? raw.split(",").filter(Boolean) : [];
}

function toParams(sp: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, one);
  }
  return params;
}

function href(pathname: string, params: URLSearchParams): string {
  // Paging always restarts when the result set changes underneath it.
  params.delete("page");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Set one facet to exactly these values, or drop it when there are none. */
export function withFacet(pathname: string, sp: SearchParams, facetKey: string, values: string[]): string {
  const params = toParams(sp);
  for (const prefix of ["filter", "rangeMin", "rangeMax"]) params.delete(`${prefix}[${facetKey}]`);
  if (values.length > 0) params.set(`filter[${facetKey}]`, values.join(","));
  return href(pathname, params);
}

/**
 * Add or remove one value of a facet. `match` comes from the facet itself: "any"/"all" facets accumulate
 * values, a "single" one replaces — so a toggle or a range behaves correctly without being recognised.
 */
export function toggleFacet(
  pathname: string,
  sp: SearchParams,
  facetKey: string,
  value: string,
  match: string,
): string {
  const current = selectedValues(sp, facetKey);
  const on = current.includes(value);
  if (match === "single") return withFacet(pathname, sp, facetKey, on ? [] : [value]);
  return withFacet(pathname, sp, facetKey, on ? current.filter((v) => v !== value) : [...current, value]);
}

/** Set (or, with null, remove) any other query parameter — `q`, `sort`, `page`. */
export function withParam(pathname: string, sp: SearchParams, key: string, value: string | null): string {
  const params = toParams(sp);
  if (value === null) params.delete(key);
  else params.set(key, value);
  // Only paging itself keeps the page number; changing the query or the sort starts over at page 1.
  if (key !== "page") return href(pathname, params);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Every filter parameter dropped: the "clear all" link. */
export function withoutFilters(pathname: string, sp: SearchParams): string {
  const params = toParams(sp);
  for (const key of [...params.keys()]) {
    if (/^(filter|rangeMin|rangeMax)\[/.test(key)) params.delete(key);
  }
  return href(pathname, params);
}

/** The searchParams as hidden inputs, so a GET form keeps the filters that are already applied. */
export function hiddenFields(sp: SearchParams, except: string[]): { name: string; value: string }[] {
  const fields: { name: string; value: string }[] = [];
  for (const [name, value] of toParams(sp).entries()) {
    if (except.includes(name) || name === "page") continue;
    fields.push({ name, value });
  }
  return fields;
}
