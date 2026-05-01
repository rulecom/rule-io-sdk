/**
 * Unit tests for {@link createOrderCancellationEmail}.
 *
 * Exercises the builder through its public API; asserts the produced
 * RCML document carries the expected text, placeholders, and
 * conditional sections (order-date row, support callout, etc.).
 */

import { describe, expect, it } from 'vitest'

import type { CustomFieldMap } from '@rule-io/core'
import { RuleConfigError } from '@rule-io/core'

import {
  TEST_THEME,
  assertValidRCMLDocument,
  docToString,
} from '../../test-fixtures.js'
import { createOrderCancellationEmail } from './order-cancellation.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Subscriber.FirstName': 200001,
  'Order.Number': 200003,
  'Order.Date': 200004,
}

describe('createOrderCancellationEmail', () => {
  it('should produce valid RCML', () => {
    const doc = createOrderCancellationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Your order has been cancelled',
        heading: 'Order Cancelled',
        greeting: 'Hello',
        message: 'Your order has been cancelled as requested.',
        orderRefLabel: 'Order',
        followUp: 'If this was a mistake, please place a new order.',
        ctaButton: 'Shop Again',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Order Cancelled')
    expect(json).toContain('Shop Again')
    expect(json).toContain('200003') // Order.Number field ID
  })

  it('renders order date when orderDate field + label supplied', () => {
    const doc = createOrderCancellationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Cancelled',
        heading: 'Order Cancelled',
        greeting: 'Hi',
        message: 'Cancelled as requested.',
        orderRefLabel: 'Order',
        orderDateLabel: 'Order date',
        followUp: 'Sorry!',
        ctaButton: 'Shop',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        orderDate: 'Order.Date',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Order date')
    expect(json).toContain('200004') // Order.Date
  })

  it('renders support callout with email link when supportEmail supplied', () => {
    const doc = createOrderCancellationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Cancelled',
        heading: 'Order Cancelled',
        greeting: 'Hi',
        message: 'Cancelled.',
        orderRefLabel: 'Order',
        followUp: 'Bye.',
        ctaButton: 'Shop',
        supportText: 'Need help?',
        supportEmail: 'help@shop.example.com',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Need help?')
    // Email local parts and @ get percent-encoded by encodeURIComponent,
    // which prevents mailto parameter injection.
    expect(json).toContain('mailto:help%40shop.example.com')
  })

  it('omits the support callout when supportText is not supplied', () => {
    const doc = createOrderCancellationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Cancelled',
        heading: 'Order Cancelled',
        greeting: 'Hi',
        message: 'Cancelled.',
        orderRefLabel: 'Order',
        followUp: 'Bye.',
        ctaButton: 'Shop',
        supportEmail: 'help@shop.example.com',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    const json = docToString(doc)

    expect(json).not.toContain('mailto:help%40shop.example.com')
  })

  it('uses the sanitized URL as link text so displayed text and href stay in sync', () => {
    // sanitizeUrl trims whitespace; displayed link text must reflect that.
    const doc = createOrderCancellationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Cancelled',
        heading: 'Order Cancelled',
        greeting: 'Hi',
        message: 'Cancelled.',
        orderRefLabel: 'Order',
        followUp: 'Bye.',
        ctaButton: 'Shop',
        supportText: 'Need help?',
        supportUrl: '  https://support.example.com  ',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    const json = docToString(doc)

    // Raw padded URL must not appear as displayed text
    expect(json).not.toContain('  https://support.example.com  ')
    expect(json).toContain('https://support.example.com')
  })

  it('rejects support emails containing reserved URI characters that could inject mailto parameters', () => {
    // `?`, `#`, `&`, `/`, `:` in a mailto address can hijack headers
    // or URL parsing
    const injectionAttempts = [
      'help@shop.example.com?bcc=attacker@evil.com',
      'help@shop.example.com&bcc=attacker@evil.com',
      'help@shop.example.com#fragment',
      'help:password@shop.example.com',
      'help/path@shop.example.com',
    ]

    for (const supportEmail of injectionAttempts) {
      expect(() =>
        createOrderCancellationEmail({
          theme: TEST_THEME,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Cancelled',
            heading: 'Order Cancelled',
            greeting: 'Hi',
            message: 'Cancelled.',
            orderRefLabel: 'Order',
            followUp: 'Bye.',
            ctaButton: 'Shop',
            supportText: 'Need help?',
            supportEmail,
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
          },
        }),
      ).toThrow(RuleConfigError)
    }
  })

  it('rejects support emails containing whitespace or control characters', () => {
    expect(() =>
      createOrderCancellationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportText: 'Need help?',
          supportEmail: 'help@shop.example.com\r\nBcc: attacker@evil.com',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      }),
    ).toThrow(RuleConfigError)

    expect(() =>
      createOrderCancellationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportText: 'Need help?',
          supportEmail: 'not-an-email',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      }),
    ).toThrow(RuleConfigError)
  })

  it('wraps supportEmail validation error with template prefix exactly once', () => {
    // Regression: the inner throw must not hardcode the template name,
    // since withTemplateContext prepends it. A duplicated prefix would
    // look like "createOrderCancellationEmail > createOrderCancellationEmail: ...".
    try {
      createOrderCancellationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportText: 'Need help?',
          supportEmail: 'not-an-email',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      })
      throw new Error('expected createOrderCancellationEmail to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError)
      const message = (error as RuleConfigError).message
      const occurrences = message.split('createOrderCancellationEmail').length - 1

      expect(occurrences).toBe(1)
    }
  })

  it('does not throw when orderDate is mapped without orderDateLabel', () => {
    // Regression: the order-date row uses a conditional block that
    // skips silently when either side is missing. Validation must
    // match the render gate.
    expect(() =>
      createOrderCancellationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          orderDate: 'Order.MissingDate', // not in customFields, but no label — won't render
        },
      }),
    ).not.toThrow()
  })
})
