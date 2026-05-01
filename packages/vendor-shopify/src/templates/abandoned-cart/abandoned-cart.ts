/**
 * Abandoned-cart email template builder.
 *
 * Consumes the v3 XML template at `./abandoned-cart.xml` and the JSON
 * copy tree at `./abandoned-cart-copy.json`, then hands both to
 * {@link compileTemplate} along with a typed context containing
 * `TemplateRef` values. The compiler serializes refs into RFM
 * placeholder strings at render time. The rendered XML is parsed into
 * an {@link RcmlDocument} and themed via `applyTheme`.
 *
 * Context is fully structural — the XML's `<?if?>` guards probe for
 * the presence of ref descriptors / optional sub-objects directly
 * (`<?if cart.products?>`, `<?if cart.products.itemSku?>`) rather than
 * carrying parallel `has*` flags.
 */

import type { CustomFieldMap, EmailTheme, FooterConfig } from '@rule-io/core'
import {
  applyTheme,
  validateRequiredFields,
  withTemplateContext,
  xmlToRcml,
  type RcmlDocument,
} from '@rule-io/rcml'
import {
  compileTemplate,
  customField,
  loadCopy,
  loadTemplate,
  loopValue,
} from '@rule-io/templates'

import type { AbandonedCartTemplateCopy } from './create-abandoned-cart-template.js'

const TEMPLATE_XML = loadTemplate(import.meta.url, './abandoned-cart.xml')
const copy = loadCopy<AbandonedCartTemplateCopy>(
  import.meta.url,
  './abandoned-cart-copy.json',
)

/** Split a dotted logical field name into its group/leaf parts. */
function splitDottedName(fullName: string): { group: string; name: string } {
  const dot = fullName.indexOf('.')

  return dot === -1
    ? { group: '', name: fullName }
    : { group: fullName.slice(0, dot), name: fullName.slice(dot + 1) }
}

/**
 * Configuration accepted by {@link createAbandonedCartEmail}.
 */
export interface AbandonedCartConfig {
  theme: EmailTheme
  customFields: CustomFieldMap
  cartUrl: string
  footer?: FooterConfig
  text: {
    preheader: string
    greeting: string
    message: string
    reminder: string
    ctaButton: string
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string
    /** Label for the cart total row */
    totalLabel?: string
  }
  fieldNames: {
    firstName: string
    /** Repeatable items field (enables rc-loop rendering) */
    items?: string
    /** Line item sub-field: product name */
    itemName?: string
    /** Line item sub-field: quantity */
    itemQuantity?: string
    /** Line item sub-field: unit price */
    itemUnitPrice?: string
    /** Line item sub-field: SKU */
    itemSku?: string
    /** Cart total */
    totalPrice?: string
  }
}

/**
 * Create an abandoned-cart recovery email template.
 *
 * @param config - Caller configuration (theme, custom field map,
 *   text labels, field-name overrides, footer overrides, cart URL).
 * @returns A themed {@link RcmlDocument}.
 */
export function createAbandonedCartEmail(
  config: AbandonedCartConfig,
): RcmlDocument {
  return withTemplateContext('createAbandonedCartEmail', () => {
    const { theme, customFields, fieldNames, text } = config

    const wantsLineItemLoop = !!(fieldNames.items && fieldNames.itemName)
    const wantsTotalRow = !!(text.totalLabel && fieldNames.totalPrice)

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
    }

    if (wantsLineItemLoop && fieldNames.items) fieldsToValidate.items = fieldNames.items
    if (wantsTotalRow && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice
    validateRequiredFields(customFields, fieldsToValidate)

    // Typed refs for custom fields + loop values. The compiler serializes
    // them into RFM placeholder strings at render time via the default
    // TemplateRefSerializer — no pre-rendering here.
    const firstName = (() => {
      const { group, name } = splitDottedName(fieldNames.firstName)

      return customField(group, name, customFields[fieldNames.firstName])
    })()

    const totalPrice = wantsTotalRow && fieldNames.totalPrice
      ? (() => {
        const { group, name } = splitDottedName(fieldNames.totalPrice)

        return customField(group, name, customFields[fieldNames.totalPrice])
      })()
      : undefined

    const products = wantsLineItemLoop && fieldNames.items && fieldNames.itemName
      ? {
        source: (() => {
          const { group, name } = splitDottedName(fieldNames.items)

          return customField(group, name, customFields[fieldNames.items])
        })(),
        itemName: loopValue(fieldNames.itemName),
        itemSku: fieldNames.itemSku ? loopValue(fieldNames.itemSku) : undefined,
        itemQuantity: fieldNames.itemQuantity ? loopValue(fieldNames.itemQuantity) : undefined,
        itemPrice: fieldNames.itemUnitPrice ? loopValue(fieldNames.itemUnitPrice) : undefined,
      }
      : undefined

    // Omit-if-empty fields — empty string / empty array are truthy per
    // the engine's `<?if?>` rules, so guards only work when the field
    // is absent or explicitly undefined.
    const logoUrl = theme.images.logo?.url
    const socialEntries = Object.values(theme.links)
    const socialLinkEntries = socialEntries.length > 0 ? socialEntries : undefined

    const data = {
      recipient: { firstName },
      cart: {
        url: config.cartUrl,
        totalPrice,
        products,
      },
      logoUrl,
      socialLinkEntries,
      footer: {
        fontSize: config.footer?.fontSize ?? '10px',
        textColor: config.footer?.textColor ?? '#666666',
      },
    }

    const { xml: interpolatedXml } = compileTemplate({
      template: TEMPLATE_XML,
      copy,
      context: data,
    })

    const baseDoc = xmlToRcml(interpolatedXml)

    return applyTheme(baseDoc, theme)
  })
}
