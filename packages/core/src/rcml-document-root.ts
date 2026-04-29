/**
 * Minimal structural shape of an RCML document root.
 *
 * The full `RCMLDocument` tree (with `rc-head` / `rc-body` children and the
 * deep block/inline node hierarchy) lives in `@rule-io/rcml`'s `types.ts`.
 * Core only knows the root tag literal so vendor-contract types
 * ({@link AutomationConfigV2.templateBuilder}, {@link VendorAutomation.templateBuilder})
 * can reference a document return type without dragging the full RCML tree
 * into `@rule-io/core`.
 *
 * `@rule-io/rcml`'s `RCMLDocument` extends this interface, so any function
 * that returns `RCMLDocument` is structurally assignable to a position
 * expecting `RCMLDocumentRoot`.
 */
export interface RCMLDocumentRoot {
  readonly tagName: 'rcml';
}
