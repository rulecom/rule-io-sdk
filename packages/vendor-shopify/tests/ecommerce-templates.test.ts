/**
 * Unit tests for the e-commerce + welcome email template builders.
 *
 * These tests used to live in `@rule-io/rcml`'s `tests/templates.test.ts`
 * alongside brand-template tests. They moved here when the e-commerce and
 * generic templates moved into `vendor-shopify/src/ecommerce-templates.ts`
 * and `vendor-shopify/src/generic-templates.ts`.
 */

import { describe, expect, it } from 'vitest'
import type { CustomFieldMap } from '@rule-io/core';
import { createStatusTrackerSection } from '@rule-io/client';
import { RuleConfigError } from '@rule-io/core'
import {
  createAbandonedCartEmail,
  createOrderCancellationEmail,
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
} from '../src/ecommerce-templates.js'
import { createWelcomeEmail } from '../src/generic-templates.js'
import { TEST_BRAND_STYLE, assertValidRCMLDocument, docToString } from './helpers.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  // Subscriber fields
  'Subscriber.FirstName': 200001,
  'Subscriber.LastName': 200002,
  // Order fields
  'Order.Number': 200003,
  'Order.Date': 200004,
  'Order.TotalPrice': 200005,
  'Order.TotalTax': 200006,
  'Order.TotalWeight': 200007,
  'Order.Discount': 200008,
  'Order.Currency': 200009,
  'Order.Gateway': 200010,
  'Order.ProductCount': 200011,
  'Order.Names': 200012,
  'Order.Skus': 200013,
  'Order.Products': 200014,
  'Order.CartUrl': 200015,
  // Shipping address
  'Order.ShippingAddress1': 200016,
  'Order.ShippingAddress2': 200017,
  'Order.ShippingCity': 200018,
  'Order.ShippingZip': 200019,
  'Order.ShippingCountryCode': 200020,
  // Additional test-only fields for generic template tests
  'Order.TrackingNumber': 200021,
  'Order.EstimatedDelivery': 200022,
  'Order.CustomerFullName': 200023,
  'Order.CustomerEmail': 200024,
  'Order.OrderDate': 200025,
  'Order.BillingAddress': 200026,
  'Order.CompanyName': 200027,
  'Order.VATNumber': 200028,
  'Order.PaymentMethod': 200029,
  'Order.Subtotal': 200030,
  'Order.TaxAmount': 200031,
  'Order.DiscountAmount': 200032,
  'Order.ShippingCost': 200033,
  'Order.ShippingCarrier': 200034,
}

describe('E-commerce Templates', () => {
  describe('createOrderConfirmationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com/orders',
        text: {
          preheader: 'Your order has been confirmed!',
          greeting: 'Hi',
          intro: 'Thank you for your order. Here are the details:',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View Order',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Summary');
      expect(json).toContain('200001'); // FirstName field ID
      expect(json).toContain('200003'); // Order.Number field ID
    });

    it('should include optional items and shipping fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Order confirmed',
          greeting: 'Hello',
          intro: 'Your order is confirmed.',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order #',
          itemsLabel: 'Items',
          totalLabel: 'Total',
          shippingLabel: 'Ship to',
          ctaButton: 'Track Order',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          shippingAddress: 'Order.ShippingAddress1',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Items');
      expect(json).toContain('Ship to');
      expect(json).toContain('200014'); // Products field ID
      expect(json).toContain('200016'); // ShippingAddress1 field ID
    });

    it('should work without optional fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Done.',
          detailsHeading: 'Order',
          orderRefLabel: 'Ref',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      // Should NOT have items/shipping labels
      expect(json).not.toContain('Items');
      expect(json).not.toContain('Ship to');
    });

    it('should render rc-loop when item sub-fields are provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Loop block present
      expect(json).toContain('rc-loop');
      expect(json).toContain('custom-field');
      expect(json).toContain('200014'); // Products field as loop-value

      // Line item sub-fields (JSON key names, not numeric IDs)
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:quantity]');
      expect(json).toContain('[LoopValue:price]');
      expect(json).toContain('[LoopValue:total]');
    });

    it('should use custom label values when provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          itemQtyLabel: 'Antal: ',
          itemUnitPriceLabel: 'Pris: ',
          itemSubtotalLabel: 'Delsumma: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Custom labels should appear
      expect(json).toContain('Antal: ');
      expect(json).toContain('Pris: ');
      expect(json).toContain('Delsumma: ');

      // Default English labels should NOT appear
      expect(json).not.toContain('Qty: ');
      expect(json).not.toContain('Price: ');
      expect(json).not.toContain('Subtotal: ');
    });

    it('should use default English labels when custom labels not provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          // No itemQtyLabel, itemUnitPriceLabel, or itemSubtotalLabel
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Default English labels should appear
      expect(json).toContain('Qty: ');
      expect(json).toContain('Price: ');
      expect(json).toContain('Subtotal: ');
    });

    it('should fall back to single-field items when no sub-fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          itemsLabel: 'Items',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          // No itemName etc. — should use single placeholder
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Should NOT have a loop
      expect(json).not.toContain('rc-loop');
      // Should have the items field as a single placeholder
      expect(json).toContain('200014'); // Products field ID
    });

    it('renders the hero heading when prefix/suffix text supplied', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          heroHeadingPrefix: 'Order',
          heroHeadingSuffix: 'confirmed',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      const json = docToString(doc);
      // Hero heading wraps orderRef placeholder with prefix/suffix text
      expect(json).toContain('Order ');
      expect(json).toContain(' confirmed');
    });

    it('renders a two-column meta row when orderDate label+field supplied', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          orderDateLabel: 'Order date',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          orderDate: 'Order.Date',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Order date');
      expect(json).toContain('200004'); // Order.Date field ID
    });

    it('renders financial summary when any financial field is mapped', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          subtotalLabel: 'Subtotal',
          taxLabel: 'Tax',
          discountLabel: 'Discount',
          shippingCostLabel: 'Shipping',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.Subtotal',
          taxAmount: 'Order.TaxAmount',
          discountAmount: 'Order.DiscountAmount',
          shippingCost: 'Order.ShippingCost',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Subtotal: ');
      expect(json).toContain('Tax: ');
      expect(json).toContain('Discount: ');
      expect(json).toContain('Shipping: ');
      expect(json).toContain('200030'); // Order.Subtotal
      expect(json).toContain('200033'); // Order.ShippingCost
    });

    it('renders address block when extended shipping fields are mapped', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          shippingAddressHeading: 'Shipping to',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          shippingAddress: 'Order.ShippingAddress1',
          shippingCity: 'Order.ShippingCity',
          shippingZip: 'Order.ShippingZip',
          shippingCountryCode: 'Order.ShippingCountryCode',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Shipping to');
      expect(json).toContain('200016'); // address1
      expect(json).toContain('200018'); // city
      expect(json).toContain('200019'); // zip
      expect(json).toContain('200020'); // country
    });

    it('omits hero heading, meta row, financial summary and address block when not configured', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      const json = docToString(doc);
      expect(json).not.toContain('Order date');
      expect(json).not.toContain('Subtotal: ');
      expect(json).not.toContain('Shipping to');
    });

    it('throws when an extended shipping field is mapped without shippingAddress', () => {
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            // shippingAddress intentionally omitted
            shippingCity: 'Order.ShippingCity',
          },
        })
      ).toThrow(RuleConfigError);
    });

    it('keeps total in details box when financial fields are mapped without labels', () => {
      // Regression: hasFinancialSummary must require both fieldName + label so
      // a mapped field with no label cannot relocate the total row into a
      // near-empty summary box.
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          // subtotalLabel intentionally omitted
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.Subtotal',
        },
      });

      const json = docToString(doc);
      // Total still rendered exactly once (in the details box, not the summary)
      expect(json.match(/Total: /g)).toHaveLength(1);
      expect(json).not.toContain('Subtotal: ');
    });

    it('renders SKU loop row when itemSku sub-field is provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          itemSkuLabel: 'SKU: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemSku: 'sku',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('SKU: ');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('does not throw when optional fields are mapped without their render partners', () => {
      // Regression: validation must match render gates. Mapping `subtotal`,
      // `discountAmount`, `taxAmount`, `shippingCost`, `paymentMethod`, or
      // `orderDate` without the paired label means the row skips silently at
      // render — validateCustomFields must not demand a customFields entry.
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            // All of these are mapped to fields that don't exist in
            // TEST_CUSTOM_FIELDS — but none of their label partners are set,
            // so they shouldn't be rendered and shouldn't be validated.
            subtotal: 'Order.MissingSubtotal',
            discountAmount: 'Order.MissingDiscount',
            taxAmount: 'Order.MissingTax',
            shippingCost: 'Order.MissingShipping',
            paymentMethod: 'Order.MissingPayment',
            orderDate: 'Order.MissingDate',
          },
        })
      ).not.toThrow();
    });

    it('still throws when a field whose render partners are set is missing from customFields', () => {
      // Rejection test for the same pattern: when both label and fieldName
      // are set, the row WILL render, so validation must catch missing fields.
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            subtotalLabel: 'Subtotal',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            subtotal: 'Order.MissingSubtotal',
          },
        })
      ).toThrow(RuleConfigError);
    });

    it('does not duplicate the template name prefix in validation errors', () => {
      // Regression: validateCustomFields used to prepend templateName itself,
      // and withTemplateContext also prepends it — producing
      // "createOrderConfirmationEmail > createOrderConfirmationEmail: missing …".
      // The prefix must appear exactly once.
      try {
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.MissingOrderRef',
            totalPrice: 'Order.TotalPrice',
          },
        });
        throw new Error('expected throw');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleConfigError);
        const msg = (error as RuleConfigError).message;
        expect(msg).toBe(
          'createOrderConfirmationEmail > missing customFields entry for fieldNames.orderRef ("Order.MissingOrderRef")'
        );
        expect(msg.split('createOrderConfirmationEmail').length - 1).toBe(1);
      }
    });
  });

  describe('createShippingUpdateEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Your order has shipped!',
          heading: 'Your Order is On Its Way',
          greeting: 'Hi',
          message: 'your order has been shipped.',
          orderRefLabel: 'Order',
          trackingLabel: 'Tracking #',
          estimatedDeliveryLabel: 'Estimated Delivery',
          ctaButton: 'Track Package',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.TrackingNumber',
          estimatedDelivery: 'Order.EstimatedDelivery',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Track Package');
      expect(json).toContain('https://track.example.com');
      expect(json).toContain('200021'); // TrackingNumber field ID
    });

    it('should work without optional tracking fields', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'your order shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      assertValidRCMLDocument(doc);
    });

    it('should render receipt sections when receipt fields provided', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipping Confirmation & Receipt',
          greeting: 'Hi',
          message: 'your order has been shipped!',
          orderRefLabel: 'Order',
          trackingLabel: 'Tracking',
          estimatedDeliveryLabel: 'Est. delivery',
          ctaButton: 'Track Shipment',
          companyLabel: 'Seller',
          vatLabel: 'VAT',
          orderDateLabel: 'Date',
          paymentMethodLabel: 'Payment',
          customerEmailLabel: 'Email',
          shippingAddressLabel: 'Ship to',
          carrierLabel: 'Carrier',
          lineItemsHeading: 'Items',
          subtotalLabel: 'Subtotal',
          taxLabel: 'Tax',
          discountLabel: 'Discount',
          shippingCostLabel: 'Shipping',
          totalLabel: 'Total',
          billingAddressLabel: 'Bill to',
          legalText: 'This is your receipt.',
          returnPolicyText: 'Return Policy',
          returnPolicyUrl: 'https://shop.example.com/returns',
          termsText: 'Terms',
          termsUrl: 'https://shop.example.com/terms',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.TrackingNumber',
          estimatedDelivery: 'Order.EstimatedDelivery',
          customerFullName: 'Order.CustomerFullName',
          customerEmail: 'Order.CustomerEmail',
          orderDate: 'Order.OrderDate',
          billingAddress: 'Order.BillingAddress',
          companyName: 'Order.CompanyName',
          vatNumber: 'Order.VATNumber',
          paymentMethod: 'Order.PaymentMethod',
          currency: 'Order.Currency',
          subtotal: 'Order.Subtotal',
          taxAmount: 'Order.TaxAmount',
          discountAmount: 'Order.DiscountAmount',
          shippingCost: 'Order.ShippingCost',
          shippingAddress: 'Order.ShippingAddress1',
          shippingCarrier: 'Order.ShippingCarrier',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Receipt sections present
      expect(json).toContain('Seller');
      expect(json).toContain('VAT');
      expect(json).toContain('Subtotal');
      expect(json).toContain('Tax');
      expect(json).toContain('Total');
      expect(json).toContain('This is your receipt.');
      expect(json).toContain('Return Policy');
      expect(json).toContain('https://shop.example.com/returns');

      // Loop block for line items
      expect(json).toContain('rc-loop');
      expect(json).toContain('custom-field');
      expect(json).toContain('200014'); // Products field ID as loop-value

      // Line item sub-fields in loop (JSON key names)
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('should use default English labels for ShippingUpdate line items', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          lineItemsHeading: 'Items',
          // No label overrides — defaults should apply
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Default English labels should appear
      expect(json).toContain('SKU: ');
      expect(json).toContain('Qty: ');
      expect(json).toContain('Unit price: ');
      expect(json).toContain('Line total: ');
    });

    it('should use custom labels for ShippingUpdate line items when provided', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          lineItemsHeading: 'Items',
          itemSkuLabel: 'Artikelnr: ',
          itemQtyLabel: 'Antal: ',
          itemUnitPriceLabel: 'Styckpris: ',
          itemLineTotalLabel: 'Radsumma: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Custom labels should appear
      expect(json).toContain('Artikelnr: ');
      expect(json).toContain('Antal: ');
      expect(json).toContain('Styckpris: ');
      expect(json).toContain('Radsumma: ');

      // Default English labels should NOT appear
      expect(json).not.toContain('SKU: ');
      expect(json).not.toContain('Qty: ');
      expect(json).not.toContain('Unit price: ');
      expect(json).not.toContain('Line total: ');
    });

    it('should render identically to base when no receipt fields provided', () => {
      const baseDoc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      assertValidRCMLDocument(baseDoc);
      const json = docToString(baseDoc);

      // No receipt content
      expect(json).not.toContain('rc-loop');
      expect(json).not.toContain('Subtotal');
      expect(json).not.toContain('receipt');
    });

    it('renders a 3-step status tracker when all three labels supplied', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'On its way',
          greeting: 'Hi',
          message: 'shipped!',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          statusConfirmedLabel: 'Confirmed',
          statusShippedLabel: 'Shipped',
          statusDeliveredLabel: 'Delivered',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Confirmed');
      expect(json).toContain('Shipped');
      expect(json).toContain('Delivered');
      // Active step (Shipped, activeIndex=1) uses the button color as background
      expect(json).toContain('#0066CC');
    });

    it('rejects status trackers with more than 4 steps', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [
            { label: 'a' },
            { label: 'b' },
            { label: 'c' },
            { label: 'd' },
            { label: 'e' },
          ],
          activeIndex: 0,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('rejects status trackers with activeIndex out of range', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [{ label: 'a' }, { label: 'b' }],
          activeIndex: 5,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
      expect(() =>
        createStatusTrackerSection({
          steps: [{ label: 'a' }, { label: 'b' }],
          activeIndex: -1,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('rejects empty step lists', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [],
          activeIndex: 0,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('distributes rounding remainder so column widths sum to 100%', () => {
      const section = createStatusTrackerSection({
        steps: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
        activeIndex: 0,
        brandStyle: TEST_BRAND_STYLE,
      });
      const widths = (section as { children: { attributes: { width: string } }[] }).children.map(
        (col) => parseInt(col.attributes.width, 10)
      );
      expect(widths.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('omits the status tracker when any step label is missing', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'On its way',
          greeting: 'Hi',
          message: 'shipped!',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          // Only two of three labels supplied — tracker should NOT render
          statusConfirmedLabel: 'Confirmed',
          statusShippedLabel: 'Shipped',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).not.toContain('Confirmed');
      expect(json).not.toContain('Delivered');
    });

    it('does not throw when optional receipt fields are mapped without their labels', () => {
      // Regression: every detailRow in shipping update skips silently when
      // either the label or fieldName is missing. Validation must match.
      expect(() =>
        createShippingUpdateEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          trackingUrl: 'https://track.example.com',
          text: {
            preheader: 'Shipped',
            heading: 'Shipped',
            greeting: 'Hi',
            message: 'your order has shipped.',
            orderRefLabel: 'Order',
            ctaButton: 'Track',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            // All mapped to fields not in TEST_CUSTOM_FIELDS, but none of
            // their label partners are set — so none render, none validate.
            trackingNumber: 'Order.MissingTracking',
            orderDate: 'Order.MissingDate',
            billingAddress: 'Order.MissingBilling',
            companyName: 'Order.MissingCompany',
            vatNumber: 'Order.MissingVat',
            subtotal: 'Order.MissingSubtotal',
            taxAmount: 'Order.MissingTax',
            totalPrice: 'Order.MissingTotal',
          },
        })
      ).not.toThrow();
    });

    it('still throws when a field whose label is set is missing from customFields', () => {
      expect(() =>
        createShippingUpdateEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          trackingUrl: 'https://track.example.com',
          text: {
            preheader: 'Shipped',
            heading: 'Shipped',
            greeting: 'Hi',
            message: 'your order has shipped.',
            orderRefLabel: 'Order',
            trackingLabel: 'Tracking',
            ctaButton: 'Track',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            trackingNumber: 'Order.MissingTracking',
          },
        })
      ).toThrow(RuleConfigError);
    });
  });

  describe('createAbandonedCartEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Return to Cart');
      expect(json).toContain('https://shop.example.com/cart');
      expect(json).toContain('left some items');
    });

    it('renders cart line items loop when items + itemName are mapped', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart waiting',
          greeting: 'Hi',
          message: 'Your cart is waiting.',
          reminder: 'Hurry!',
          ctaButton: 'Checkout',
          lineItemsHeading: 'Your Cart',
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
      });

      const json = docToString(doc);
      expect(json).toContain('rc-loop');
      expect(json).toContain('Your Cart');
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:quantity]');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('renders cart total when totalLabel + totalPrice supplied', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      expect(json).toContain('Total: ');
      expect(json).toContain('200005'); // Order.TotalPrice
    });

    it('renders social icons when brandStyle.socialLinks is provided', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: {
          ...TEST_BRAND_STYLE,
          socialLinks: [
            { name: 'facebook', href: 'https://facebook.com/shop' },
            { name: 'instagram', href: 'https://instagram.com/shop' },
          ],
        },
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
      });

      const json = docToString(doc);
      expect(json).toContain('rc-social');
      expect(json).toContain('facebook');
      expect(json).toContain('instagram');
    });

    it('omits line items, total row and social section when not configured', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      expect(json).not.toContain('rc-loop');
      expect(json).not.toContain('rc-social');
      expect(json).not.toContain('Total: ');
    });
  });

  describe('createOrderCancellationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Cancelled');
      expect(json).toContain('Shop Again');
      expect(json).toContain('200003'); // Order.Number field ID
    });

    it('renders order date when orderDate field + label supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      expect(json).toContain('Order date');
      expect(json).toContain('200004'); // Order.Date
    });

    it('renders support callout with email link when supportEmail supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      expect(json).toContain('Need help?');
      // Email local parts and @ get percent-encoded by encodeURIComponent,
      // which prevents mailto parameter injection.
      expect(json).toContain('mailto:help%40shop.example.com');
    });

    it('omits the support callout when supportText is not supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      expect(json).not.toContain('mailto:help%40shop.example.com');
    });

    it('uses the sanitized URL as link text so displayed text and href stay in sync', () => {
      // sanitizeUrl trims whitespace; displayed link text must reflect that.
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
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
      });

      const json = docToString(doc);
      // Raw padded URL must not appear as displayed text
      expect(json).not.toContain('  https://support.example.com  ');
      expect(json).toContain('https://support.example.com');
    });

    it('rejects support emails containing reserved URI characters that could inject mailto parameters', () => {
      // `?`, `#`, `&`, `/`, `:` in a mailto address can hijack headers or URL parsing
      const injectionAttempts = [
        'help@shop.example.com?bcc=attacker@evil.com',
        'help@shop.example.com&bcc=attacker@evil.com',
        'help@shop.example.com#fragment',
        'help:password@shop.example.com',
        'help/path@shop.example.com',
      ];
      for (const supportEmail of injectionAttempts) {
        expect(() =>
          createOrderCancellationEmail({
            brandStyle: TEST_BRAND_STYLE,
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
          })
        ).toThrow(RuleConfigError);
      }
    });

    it('rejects support emails containing whitespace or control characters', () => {
      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        })
      ).toThrow(RuleConfigError);

      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
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
      ).toThrow(RuleConfigError);
    });

    it('wraps supportEmail validation error with template prefix exactly once', () => {
      // Regression: the inner throw must not hardcode the template name, since
      // withTemplateContext prepends it. A duplicated prefix would look like
      // "createOrderCancellationEmail > createOrderCancellationEmail: ...".
      try {
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        });
        throw new Error('expected createOrderCancellationEmail to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleConfigError);
        const message = (error as RuleConfigError).message;
        const occurrences = message.split('createOrderCancellationEmail').length - 1;
        expect(occurrences).toBe(1);
      }
    });

    it('does not throw when orderDate is mapped without orderDateLabel', () => {
      // Regression: the order-date row uses labeledRow() which skips silently
      // when either side is missing. Validation must match the render gate.
      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        })
      ).not.toThrow();
    });
  });

  describe('createAbandonedCartEmail — items/itemName validation', () => {
    it('does not require items to be mapped in customFields when itemName is not supplied', () => {
      // items mapped but itemName not supplied — loop will not render, so items
      // should not trigger a missing-field validation error.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        })
      ).not.toThrow();
    });

    it('does not require totalPrice to be mapped in customFields when totalLabel is not supplied', () => {
      // Regression: totalPrice used to be validated unconditionally via the
      // destructured `regularFields` split. Without `text.totalLabel` the
      // total row never renders, so an unmapped totalPrice must not throw.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        })
      ).not.toThrow();
    });

    it('throws when totalPrice is mapped and totalLabel is set but customFields entry is missing', () => {
      // Rejection test: when both partners are set, the total row WILL render,
      // so validation must surface the missing customFields entry.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
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
        })
      ).toThrow(RuleConfigError);
    });
  });
});

// ============================================================================
// Welcome Email
// ============================================================================

describe('createWelcomeEmail', () => {
  it('produces valid RCML with hero + greeting + CTA', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome aboard',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Thanks for subscribing to our newsletter.',
        ctaButton: 'Start Shopping',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    assertValidRCMLDocument(doc);
    const json = docToString(doc);
    expect(json).toContain('Welcome!');
    expect(json).toContain('Thanks for subscribing');
    expect(json).toContain('Start Shopping');
    expect(json).toContain('https://shop.example.com');
    expect(json).toContain('[CustomField:200001]'); // Subscriber.FirstName
  });

  it('renders benefits list when benefits array is provided', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
        benefitsHeading: 'What you get',
        benefits: ['Free shipping over $50', 'Early access to sales', 'Members-only perks'],
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('What you get');
    expect(json).toContain('Free shipping over $50');
    expect(json).toContain('Early access to sales');
    expect(json).toContain('Members-only perks');
  });

  it('renders discount callout when discountCode is supplied', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Here is a gift.',
        ctaButton: 'Shop',
        discountHeading: 'Your welcome gift',
        discountMessage: 'Use code at checkout',
        discountCode: 'WELCOME10',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('Your welcome gift');
    expect(json).toContain('Use code at checkout');
    expect(json).toContain('WELCOME10');
  });

  it('renders social icons when brandStyle.socialLinks is provided', () => {
    const doc = createWelcomeEmail({
      brandStyle: {
        ...TEST_BRAND_STYLE,
        socialLinks: [
          { name: 'facebook', href: 'https://facebook.com/shop' },
          { name: 'instagram', href: 'https://instagram.com/shop' },
        ],
      },
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('rc-social');
    expect(json).toContain('facebook');
    expect(json).toContain('instagram');
  });

  it('omits optional sections when not configured', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).not.toContain('rc-social');
    expect(json).not.toContain('WELCOME10');
    expect(json).not.toContain('•');
  });

  it('throws RuleConfigError when firstName field is not in customFields', () => {
    expect(() =>
      createWelcomeEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Welcome',
          heading: 'Welcome!',
          greeting: 'Hi',
          intro: 'Glad you are here.',
          ctaButton: 'Shop',
        },
        fieldNames: { firstName: 'Subscriber.UnmappedFirstName' },
      })
    ).toThrow(RuleConfigError);
  });

  it('wraps config errors with template context', () => {
    try {
      createWelcomeEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Welcome',
          heading: 'Welcome!',
          greeting: 'Hi',
          intro: 'Glad you are here.',
          ctaButton: 'Shop',
        },
        fieldNames: { firstName: 'Subscriber.UnmappedFirstName' },
      });
      throw new Error('expected createWelcomeEmail to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RuleConfigError);
      expect((error as Error).message).toMatch(/createWelcomeEmail/);
    }
  });
});

// ============================================================================
// Footer localization across templates
// ============================================================================


describe('template error context (e-commerce)', () => {
  it('should include template name when createBrandLogo throws inside e-commerce template', () => {
    expect(() =>
      createOrderConfirmationEmail({
        brandStyle: {
          ...TEST_BRAND_STYLE,
          logoUrl: 'javascript:void(0)',
        },
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Test',
          greeting: 'Hi',
          intro: 'Intro',
          detailsHeading: 'Details',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      })
    ).toThrow('createOrderConfirmationEmail > createBrandLogo: invalid or unsafe logoUrl');
  });
})
