/**
 * Source location type. A point in the template source that errors
 * and AST nodes can carry to enable caret-precise error messages.
 *
 * @internal
 */

/**
 * A point in the template source.
 *
 * `offset` is a 0-based index into the raw source string; `line` and
 * `column` are 1-based for human display (matching how editors and
 * compilers like Babel, TypeScript, and V8 report positions).
 */
export interface SourceLoc {
  /** Zero-based character index into the outer source string. */
  readonly offset: number
  /** One-based line number (for display in error messages). */
  readonly line: number
  /** One-based column within the line (for display in error messages). */
  readonly column: number
}
