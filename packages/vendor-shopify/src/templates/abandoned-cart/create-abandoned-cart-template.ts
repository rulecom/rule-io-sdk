/**
 * Abandoned-cart template factory.
 *
 * Thin wrapper over the XML template + copy defaults. The caller owns
 * context assembly (building the typed {@link AbandonedCartTemplateContext}
 * with `customField` / `loopValue` from `@rule-io/templates`); the
 * factory binds copy, pulls the logo URL and social-links list from
 * the supplied theme into the compile context, compiles with
 * {@link compileTemplate}, parses to RCML, and applies the theme.
 *
 * Context is fully structural: optional sections are controlled by
 * the presence of their backing fields (e.g. omit `cart.products` to
 * skip the line-items block), never by parallel boolean flags.
 *
 * No config→context translation, no field validation, no error-context
 * wrapping. If the caller wants validation, they do it at their call site
 * before constructing the context object.
 */

import type { EmailTheme } from '@rule-io/core'
import { applyTheme, xmlToRcml, type RcmlDocument } from '@rule-io/rcml'
import {
  compileTemplate,
  loadCopy,
  loadTemplate,
  type CompileTemplateOptions,
  type CustomFieldRef,
  type LoopValueRef,
} from '@rule-io/templates'

/**
 * Typed data context consumed by `abandoned-cart.xml`.
 *
 * Presence is the contract: the XML's `<?if?>` guards probe for
 * optional sub-objects and ref descriptors directly, so optional
 * sections turn on/off by supplying (or omitting) the backing field.
 *
 * - `cart.products` absent → no line-items loop, no heading.
 * - `cart.totalPrice` absent → no total row.
 *
 * Per-line-item rows (`itemSku` / `itemQuantity` / `itemPrice`) toggle
 * on their presence as `LoopValueRef`s inside `cart.products`.
 *
 * The logo section and the social-links section are driven by the
 * theme — the factory pulls `theme.images.logo?.url` and
 * `theme.links` into the compile context so the XML's `<?if?>` gates
 * and `<?for?>` loop can see them. The logo image URL is also
 * rendered on the `<rc-logo>` element via `applyTheme`'s
 * `rcml-logo-style` class binding. The secondary-color background on
 * the total-row section comes from `theme.colors.secondary` via
 * `applyTheme`'s `rcml-brand-color` class binding. Callers filter by
 * curating their theme.
 *
 * Footer-link labels and RFM structure live inline in the
 * `footerLinks` copy entry — callers override that entry to change
 * labels, separator, or styling.
 */
export interface AbandonedCartTemplateContext {
  recipient: {
    firstName: CustomFieldRef
  }
  cart: {
    url: string
    totalPrice?: CustomFieldRef
    products?: {
      /** Items custom field; `.id` is used as `rc-loop` loop-value. */
      source: CustomFieldRef
      itemName: LoopValueRef
      itemSku?: LoopValueRef
      itemQuantity?: LoopValueRef
      itemPrice?: LoopValueRef
    }
  }
  footer: {
    fontSize: string
    textColor: string
  }
}

/**
 * Default copy tree for `abandoned-cart.xml`.
 *
 * Each entry maps to a single `<?copy key …?>` PI in the XML. Bodies
 * carry the full English text as literal strings, plus `{{slot}}`
 * substitutions for custom-field and loop-value refs supplied at
 * render time (built via `customField` / `loopValue` from
 * `@rule-io/templates`; the compiler serializes them to RFM
 * placeholder strings automatically).
 *
 * Footer-link labels and styling live inline in the `footerLinks`
 * entry alongside the RFM atom structure — override that entry to
 * tweak labels, layout, or the separator.
 *
 * To customize wording, supply a partial override to `render`'s
 * `copy?: Partial<AbandonedCartTemplateCopy>`.
 */
export interface AbandonedCartTemplateCopy {
  /** `<rc-preview>` body. */
  readonly preheader: string
  /** Hero heading. Slot: `{{firstNameCustomField}}` — CustomField placeholder. */
  readonly greetingHeading: string
  /** Body message paragraph. */
  readonly message: string
  /** Reminder paragraph. */
  readonly reminder: string
  /** Heading above the line-items loop. */
  readonly lineItemsHeading: string
  /** Loop row: item name. Slot: `{{itemNameLoopValue}}` — loop-value atom. */
  readonly itemNameLine: string
  /** Loop row: SKU label + loop value. Slot: `{{itemSkuLoopValue}}`. */
  readonly itemSkuLine: string
  /** Loop row: quantity label + loop value. Slot: `{{itemQtyLoopValue}}`. */
  readonly itemQtyLine: string
  /** Loop row: price label + loop value. Slot: `{{itemUnitPriceLoopValue}}`. */
  readonly itemUnitPriceLine: string
  /** Cart total row. Slot: `{{totalPriceCustomField}}` — CustomField placeholder. */
  readonly totalRow: string
  /** Primary CTA button label. */
  readonly ctaButton: string
  /**
   * Footer link row. Labels are inline literals; font-size and color
   * come from `rc-text` attributes on the host element;
   * `text-decoration="underline"` lives on the inner `:font` atom.
   * Override this entry to change labels, separator, or styling.
   */
  readonly footerLinks: string
  /** Fixed "Certified by Rule" footer attribution. */
  readonly certifiedByRule: string
}

/** Arguments to `render`. */
export interface AbandonedCartRenderOptions {
  /** Assembled template context (refs and optional sub-objects). */
  context: AbandonedCartTemplateContext
  /**
   * Theme applied to the compiled RCML. Also sourced by the factory
   * for the logo URL (`theme.images.logo`) and the social-links list
   * (`theme.links`), and — via `applyTheme` — for the logo `src` and
   * the secondary background colour.
   */
  theme: EmailTheme
  /**
   * Partial override of the default English copy. Entries not supplied
   * fall back to the baked-in defaults from `./abandoned-cart-copy.ts`.
   * To suppress the line-items heading specifically, override
   * `lineItemsHeading` with an empty string.
   */
  copy?: Partial<AbandonedCartTemplateCopy>
}

/** Factory output: a descriptor with a single `render` method. */
export interface AbandonedCartTemplate {
  render(opts: AbandonedCartRenderOptions): RcmlDocument
}

/**
 * Return a renderer bound to the abandoned-cart XML. Call
 * `render({ context, theme, copy? })` to produce the themed
 * {@link RcmlDocument}. Copy overrides apply per-render, not per-factory
 * — the same template instance can render multiple locales/brand voices.
 */
export function createAbandonedCartTemplate(): AbandonedCartTemplate {
  const template = loadTemplate(import.meta.url, './abandoned-cart.xml');
  const defaultCopy = loadCopy<AbandonedCartTemplateCopy>(import.meta.url, './abandoned-cart-copy.json');

  return {
    render({ context, theme, copy: copyOverride }) {
      const copy = { ...defaultCopy, ...copyOverride };
      const logoUrl = theme.images.logo?.url;
      const themeSocials = Object.values(theme.links)
      const socialLinks = themeSocials.length > 0 ? themeSocials : undefined
      const options: CompileTemplateOptions<AbandonedCartTemplateCopy, unknown> = {
        template,
        copy,
        context: { ...context, logoUrl, socialLinks },
      }

      const { xml } = compileTemplate(options)

      return applyTheme(xmlToRcml(xml), theme)
    },
  }
}
