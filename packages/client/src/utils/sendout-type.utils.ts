/**
 * Coerces an unknown value to a numeric sendout-type (1 or 2).
 *
 * Accepts either a plain number or the API's descriptor object
 * `{ value: number, key: string, description: string }`.
 *
 * @internal
 */
export function toNumericSendout(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;

  if (v != null && typeof v === 'object' && 'value' in v) {
    const val = (v as { value: unknown }).value;

    if (typeof val === 'number' && Number.isFinite(val)) return val;
  }

  return undefined;
}
