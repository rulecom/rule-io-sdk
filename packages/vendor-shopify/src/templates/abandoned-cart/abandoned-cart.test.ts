/**
 * Unit tests for {@link createAbandonedCartEmail}.
 *
 * Exercises line-item loop, total row, social icons, and the
 * validation/render-gate parity on optional fields.
 */

import { describe, expect, it } from 'vitest'

import type { CustomFieldMap } from '@rule-io/core'
import { RuleConfigError } from '@rule-io/core'

import {
  TEST_THEME,
  TEST_THEME_WITH_SOCIALS,
  assertValidRCMLDocument,
  docToString,
} from '../../test-fixtures.js'
import { createAbandonedCartEmail } from './abandoned-cart.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Subscriber.FirstName': 200001,
  'Order.TotalPrice': 200005,
  'Order.Products': 200014,
}

describe('createAbandonedCartEmail', () => {
  it('should produce valid RCML', () => {
    const doc = createAbandonedCartEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      cartUrl: 'https://shop.example.com/cart',
      text: {
        preheader: 'Did you forget something?',
        greeting: 'Hey',
        message: 'You left some items in your cart.',
        reminder: 'Complete your purchase before they sell out!',
        ctaButton: 'Return to Cart',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Return to Cart')
    expect(json).toContain('https://shop.example.com/cart')
    expect(json).toContain('left some items')
  })

  it('renders cart line items loop when items + itemName are mapped', () => {
    const doc = createAbandonedCartEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      cartUrl: 'https://shop.example.com/cart',
      text: {
        preheader: 'Cart waiting',
        greeting: 'Hi',
        message: 'Your cart is waiting.',
        reminder: 'Hurry!',
        ctaButton: 'Checkout',
        itemQtyLabel: 'Qty: ',
        itemSkuLabel: 'SKU: ',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemSku: 'sku',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('rc-loop')
    expect(json).toContain('Your Cart')
    expect(json).toContain('[LoopValue:name]')
    expect(json).toContain('[LoopValue:quantity]')
    expect(json).toContain('[LoopValue:sku]')
  })

  it('renders cart total when totalLabel + totalPrice supplied', () => {
    const doc = createAbandonedCartEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      cartUrl: 'https://shop.example.com/cart',
      text: {
        preheader: 'Cart',
        greeting: 'Hi',
        message: 'You left items.',
        reminder: 'Back soon!',
        ctaButton: 'Cart',
        totalLabel: 'Total',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        totalPrice: 'Order.TotalPrice',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Total: ')
    expect(json).toContain('200005') // Order.TotalPrice
  })

  it('renders social icons when theme.links is populated', () => {
    const doc = createAbandonedCartEmail({
      theme: TEST_THEME_WITH_SOCIALS,
      customFields: TEST_CUSTOM_FIELDS,
      cartUrl: 'https://shop.example.com/cart',
      text: {
        preheader: 'Cart',
        greeting: 'Hi',
        message: 'You left items.',
        reminder: 'Back soon!',
        ctaButton: 'Cart',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    })

    const json = docToString(doc)

    expect(json).toContain('rc-social')
    expect(json).toContain('facebook')
    expect(json).toContain('instagram')
  })

  it('omits line items, total row and social section when not configured', () => {
    const doc = createAbandonedCartEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      cartUrl: 'https://shop.example.com/cart',
      text: {
        preheader: 'Cart',
        greeting: 'Hi',
        message: 'Come back!',
        reminder: 'Soon!',
        ctaButton: 'Cart',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    })

    const json = docToString(doc)

    expect(json).not.toContain('rc-loop')
    expect(json).not.toContain('rc-social')
    expect(json).not.toContain('Total: ')
  })
})

describe('createAbandonedCartEmail — items/itemName validation', () => {
  it('does not require items to be mapped in customFields when itemName is not supplied', () => {
    // items mapped but itemName not supplied — loop will not render,
    // so items should not trigger a missing-field validation error.
    expect(() =>
      createAbandonedCartEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'You left items.',
          reminder: 'Hurry!',
          ctaButton: 'Cart',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          items: 'Order.UnmappedItems', // not in customFields — no error expected
        },
      }),
    ).not.toThrow()
  })

  it('does not require totalPrice to be mapped in customFields when totalLabel is not supplied', () => {
    // Regression: totalPrice used to be validated unconditionally.
    // Without `text.totalLabel` the total row never renders, so an
    // unmapped totalPrice must not throw.
    expect(() =>
      createAbandonedCartEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'You left items.',
          reminder: 'Hurry!',
          ctaButton: 'Cart',
          // totalLabel intentionally omitted → total row won't render.
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          totalPrice: 'Order.UnmappedTotal', // not in customFields
        },
      }),
    ).not.toThrow()
  })

  it('throws when totalPrice is mapped and totalLabel is set but customFields entry is missing', () => {
    // Rejection test: when both partners are set, the total row WILL
    // render, so validation must surface the missing customFields entry.
    expect(() =>
      createAbandonedCartEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'You left items.',
          reminder: 'Hurry!',
          ctaButton: 'Cart',
          totalLabel: 'Total',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          totalPrice: 'Order.UnmappedTotal',
        },
      }),
    ).toThrow(RuleConfigError)
  })
})
