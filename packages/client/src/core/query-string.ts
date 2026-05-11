/**
 * URL query-string serializer used by every namespace client.
 *
 * Accepts a flat record of scalar values or arrays of scalars. Array values
 * emit one entry per element (e.g. `{ ids: [1, 2] }` → `?ids=1&ids=2`), and
 * `undefined` / `null` entries are dropped so callers can pass partial
 * parameter bags without filtering first.
 */

/** Scalar query-param value. */
export type QueryParamValue = string | number | boolean | null | undefined;

/** Query-param bag accepted by {@link buildQueryString}. */
export type QueryParamValues = Record<string, QueryParamValue | QueryParamValue[]>;

export function buildQueryString(params: QueryParamValues): string {
  const pairs: string[] = [];

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null) {
          pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
        }
      }
    } else {
      pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }

  return pairs.length === 0 ? '' : `?${pairs.join('&')}`;
}
