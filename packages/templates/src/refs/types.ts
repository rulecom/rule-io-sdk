/**
 * Typed template references — values that flow through `compileTemplate`
 * context as data rather than pre-rendered placeholder strings.
 *
 * A {@link TemplateRef} describes *what* the value refers to (a custom
 * field, a loop value); the compiler serializes it into the final
 * provider-specific string at the last moment, via a
 * {@link TemplateRefSerializer}. Callers stay format-agnostic.
 *
 * See `docs/typed-template-refs.md` for the architectural rationale.
 *
 * @public
 */

/**
 * Reference to a backend-resolved custom field (e.g. `Subscriber.FirstName`).
 *
 * `group` + `name` identify the field logically. `id` is the backend's
 * numeric identifier — optional in the type so callers can build refs
 * before the id is known, but **required at serialization time** for
 * formats that encode it (like RFM's `[CustomField:<id>]` form).
 *
 * @public
 */
export interface CustomFieldRef {
  readonly kind: 'custom-field'
  readonly group: string
  readonly name: string
  readonly id?: string | number
}

/**
 * Reference to a property of the current loop item (e.g. `name`, `sku`,
 * `quantity`). Only meaningful inside a `<?for?>`-driven loop.
 *
 * @public
 */
export interface LoopValueRef {
  readonly kind: 'loop-value'
  readonly key: string
}

/**
 * Discriminated union of every supported template reference kind.
 * Extend by adding new variants + matching {@link TemplateRefSerializer}
 * methods.
 *
 * @public
 */
export type TemplateRef = CustomFieldRef | LoopValueRef

/**
 * Pluggable serializer that converts {@link TemplateRef} values to the
 * provider-specific placeholder strings emitted at render time.
 *
 * A default implementation targeting the Rule.io RFM format ships as
 * {@link defaultTemplateRefSerializer}. Callers can pass their own via
 * `compileTemplate({ serializer })` to target another backend.
 *
 * @public
 */
export interface TemplateRefSerializer {
  serializeCustomField(ref: CustomFieldRef): string
  serializeLoopValue(ref: LoopValueRef): string
}
