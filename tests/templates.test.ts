/**
 * Template Builder Tests
 *
 * Tests for hospitality and e-commerce template builders,
 * brand template utilities, and placeholder helpers.
 */

import { describe, it, expect } from 'vitest';
import type { RCMLDocument } from '../src/types';
import type { BrandStyleConfig, CustomFieldMap } from '../src/rcml';
import { RuleConfigError } from '../src/errors';
import { validateCustomFields } from '../src/rcml/brand-template';
import {
  // Brand template utilities
  createBrandTemplate,
  createBrandHead,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  // Hospitality templates
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
  // E-commerce templates
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
} from '../src/rcml';

// ============================================================================
// Shared test fixtures
// ============================================================================

const TEST_BRAND_STYLE: BrandStyleConfig = {
  brandStyleId: '99999',
  logoUrl: 'https://example.com/logo.png',
  buttonColor: '#0066CC',
  bodyBackgroundColor: '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  brandColor: '#f6f8f9',
  headingFont: "'Helvetica Neue', sans-serif",
  headingFontUrl: 'https://app.rule.io/brand-style/99999/font/1/css',
  bodyFont: "'Arial', sans-serif",
  bodyFontUrl: 'https://app.rule.io/brand-style/99999/font/2/css',
  textColor: '#1A1A1A',
};

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Booking.FirstName': 100001,
  'Booking.BookingRef': 100002,
  'Booking.ServiceType': 100003,
  'Booking.CheckInDate': 100004,
  'Booking.CheckOutDate': 100005,
  'Booking.TotalGuests': 100006,
  'Booking.TotalPrice': 100007,
  'Booking.RoomName': 100008,
  'Order.CustomerName': 200001,
  'Order.OrderRef': 200002,
  'Order.Total': 200003,
  'Order.Items': 200004,
  'Order.ShippingAddress': 200005,
  'Order.TrackingNumber': 200006,
  'Order.EstimatedDelivery': 200007,
};

// ============================================================================
// Helpers
// ============================================================================

function assertValidRCMLDocument(doc: RCMLDocument): void {
  expect(doc.tagName).toBe('rcml');
  expect(doc.children).toHaveLength(2);
  expect(doc.children[0].tagName).toBe('rc-head');
  expect(doc.children[1].tagName).toBe('rc-body');

  const body = doc.children[1];
  expect(body.children.length).toBeGreaterThan(0);
}

function docToString(doc: RCMLDocument): string {
  return JSON.stringify(doc);
}

// ============================================================================
// Brand Template Utilities
// ============================================================================

describe('Brand Template Utilities', () => {
  describe('createPlaceholder', () => {
    it('should create a placeholder node with field name and ID', () => {
      const node = createPlaceholder('Order.CustomerName', 200001);

      expect(node.type).toBe('placeholder');
      expect(node.attrs.type).toBe('CustomField');
      expect(node.attrs.name).toBe('Order.CustomerName');
      expect(node.attrs.value).toBe(200001);
      expect(node.attrs.original).toBe('[CustomField:200001]');
    });
  });

  describe('createTextNode', () => {
    it('should create a text node', () => {
      const node = createTextNode('Hello');

      expect(node.type).toBe('text');
      expect(node.text).toBe('Hello');
    });
  });

  describe('createDocWithPlaceholders', () => {
    it('should create a ProseMirror doc with mixed content', () => {
      const doc = createDocWithPlaceholders([
        createTextNode('Hello '),
        createPlaceholder('Order.CustomerName', 200001),
        createTextNode('!'),
      ]);

      expect(doc.type).toBe('doc');
      expect(doc.content).toHaveLength(1);
      expect(doc.content[0].type).toBe('paragraph');
      expect(doc.content[0].content).toHaveLength(3);
      expect(doc.content[0].content![0].type).toBe('text');
      expect(doc.content[0].content![1].type).toBe('placeholder');
      expect(doc.content[0].content![2].type).toBe('text');
    });
  });

  describe('createBrandTemplate', () => {
    it('should create a valid RCML document', () => {
      const doc = createBrandTemplate({
        brandStyle: TEST_BRAND_STYLE,
        preheader: 'Test preheader',
        sections: [
          createContentSection([
            createBrandText(createDocWithPlaceholders([createTextNode('Hello')])),
          ]),
        ],
      });

      assertValidRCMLDocument(doc);
    });

    it('should include brand style ID in head', () => {
      const doc = createBrandTemplate({
        brandStyle: TEST_BRAND_STYLE,
        sections: [
          createContentSection([
            createBrandText(createDocWithPlaceholders([createTextNode('Test')])),
          ]),
        ],
      });

      const head = doc.children[0];
      const brandStyleEl = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-brand-style'
      );
      expect(brandStyleEl).toBeDefined();
    });
  });

  describe('createBrandHead', () => {
    it('should create head with preheader', () => {
      const head = createBrandHead(TEST_BRAND_STYLE, { preheader: 'Preview text' });

      expect(head.tagName).toBe('rc-head');
      const preview = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-preview'
      );
      expect(preview).toBeDefined();
    });

    it('should include plain text fallback', () => {
      const head = createBrandHead(TEST_BRAND_STYLE, { plainText: 'Custom plain text' });

      const plainText = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-plain-text'
      );
      expect(plainText).toBeDefined();
    });
  });

  describe('createFooterSection', () => {
    it('should create footer with default English text', () => {
      const footer = createFooterSection();
      const json = JSON.stringify(footer);

      expect(json).toContain('View in browser');
      expect(json).toContain('Unsubscribe');
    });

    it('should accept custom localized text', () => {
      const footer = createFooterSection({
        viewInBrowserText: 'Öppna i webbläsare',
        unsubscribeText: 'Avregistrera',
      });
      const json = JSON.stringify(footer);

      expect(json).toContain('Öppna i webbläsare');
      expect(json).toContain('Avregistrera');
      expect(json).not.toContain('View in browser');
    });

    it('should accept custom colors and font size', () => {
      const footer = createFooterSection({
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: '12px',
      });
      const json = JSON.stringify(footer);

      expect(json).toContain('#000000');
      expect(json).toContain('#FFFFFF');
      expect(json).toContain('12px');
    });
  });

  describe('createBrandLogo', () => {
    it('should create a logo element', () => {
      const logo = createBrandLogo();
      expect(logo.tagName).toBe('rc-section');
    });
  });

  describe('createBrandHeading', () => {
    it('should create heading with content', () => {
      const heading = createBrandHeading(
        createDocWithPlaceholders([createTextNode('Welcome')])
      );
      expect(heading.tagName).toBe('rc-heading');
    });

    it('should accept heading level', () => {
      const heading = createBrandHeading(
        createDocWithPlaceholders([createTextNode('Subtitle')]),
        2
      );
      expect(heading.tagName).toBe('rc-heading');
    });
  });

  describe('createBrandButton', () => {
    it('should create button with href', () => {
      const button = createBrandButton(
        createDocWithPlaceholders([createTextNode('Click')]),
        'https://example.com'
      );
      expect(button.tagName).toBe('rc-button');
      expect(button.attributes?.href).toBe('https://example.com');
    });

    it('should throw RuleConfigError for invalid URL', () => {
      expect(() =>
        createBrandButton(
          createDocWithPlaceholders([createTextNode('Click')]),
          'javascript:alert(1)'
        )
      ).toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for empty URL', () => {
      expect(() =>
        createBrandButton(
          createDocWithPlaceholders([createTextNode('Click')]),
          'not-a-url'
        )
      ).toThrow(RuleConfigError);
    });
  });

  describe('createContentSection', () => {
    it('should create section with children', () => {
      const section = createContentSection([
        createBrandText(createDocWithPlaceholders([createTextNode('Content')])),
      ]);
      expect(section.tagName).toBe('rc-section');
    });

    it('should accept padding and background color', () => {
      const section = createContentSection(
        [createBrandText(createDocWithPlaceholders([createTextNode('Content')]))],
        { padding: '40px 0', backgroundColor: '#FF0000' }
      );
      expect(section.attributes?.padding).toBe('40px 0');
      expect(section.attributes?.['background-color']).toBe('#FF0000');
    });
  });
});

// ============================================================================
// Validation
// ============================================================================

describe('validateCustomFields', () => {
  it('should pass when all required fields are present', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
      'Order.Name': 101,
    };
    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref', name: 'Order.Name' }, 'test')
    ).not.toThrow();
  });

  it('should throw RuleConfigError for missing required field', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
    };
    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref', name: 'Order.Name' }, 'test')
    ).toThrow(RuleConfigError);
  });

  it('should include field name in error message', () => {
    const customFields: CustomFieldMap = {};
    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref' }, 'createOrderEmail')
    ).toThrow('createOrderEmail: missing customFields entry for fieldNames.orderRef ("Order.Ref")');
  });

  it('should skip undefined (optional) field names', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
    };
    expect(() =>
      validateCustomFields(
        customFields,
        { orderRef: 'Order.Ref', items: undefined },
        'test'
      )
    ).not.toThrow();
  });
});

// ============================================================================
// Hospitality Templates
// ============================================================================

describe('Hospitality Templates', () => {
  describe('createReservationConfirmationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Thank you for your reservation!',
          greeting: 'Hello',
          intro: 'We look forward to welcoming you!',
          detailsHeading: 'Reservation Details',
          referenceLabel: 'Reference',
          serviceLabel: 'Service',
          roomLabel: 'Room',
          checkInLabel: 'Check-in',
          checkOutLabel: 'Check-out',
          guestsLabel: 'Guests',
          totalPriceLabel: 'Total',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
          totalPrice: 'Booking.TotalPrice',
          roomName: 'Booking.RoomName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Reservation Details');
      expect(json).toContain('100001'); // FirstName field ID
      expect(json).toContain('100002'); // BookingRef field ID
    });

    it('should work without optional fields (room, checkout, price)', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Confirmed!',
          greeting: 'Hi',
          intro: 'Your reservation is confirmed.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Type',
          checkInLabel: 'Date',
          guestsLabel: 'Guests',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      // Should NOT contain optional field labels
      expect(json).not.toContain('Room');
      expect(json).not.toContain('Check-out');
    });
  });

  describe('createReservationCancellationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your reservation has been cancelled',
          heading: 'Reservation Cancelled',
          greeting: 'Hello',
          message: 'Your reservation has been cancelled as requested.',
          followUp: 'We hope to see you again!',
          ctaButton: 'Make a New Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Reservation Cancelled');
      expect(json).toContain('Make a New Reservation');
    });
  });

  describe('createReservationReminderEmail', () => {
    it('should produce valid RCML with all optional fields', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your stay starts soon!',
          greeting: 'Welcome',
          intro: 'Your stay begins soon. We look forward to seeing you!',
          detailsHeading: 'Your Reservation',
          dateLabel: 'Dates',
          roomLabel: 'Room',
          practicalInfoHeading: 'Practical Information',
          practicalInfo: 'Check-in from 3:00 PM. Check-out by 11:00 AM.',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          roomName: 'Booking.RoomName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Practical Information');
      expect(json).toContain('Check-in from 3:00 PM');
    });

    it('should work without optional practical info', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'Your reservation is coming up.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).not.toContain('Practical Information');
    });

    it('should handle single date (no check-out)', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'See you soon.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
          // no checkOutDate
        },
      });

      assertValidRCMLDocument(doc);
    });
  });

  describe('createFeedbackRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createFeedbackRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        feedbackUrl: 'https://example.com/feedback',
        text: {
          preheader: 'Thank you for your visit!',
          greeting: 'Thank you',
          message: 'We would love to hear about your experience.',
          ctaButton: 'Leave Feedback',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Leave Feedback');
      expect(json).toContain('https://example.com/feedback');
    });
  });

  describe('createReservationRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'We received your request',
          greeting: 'Thank you',
          message: 'We have received your reservation request and will confirm shortly.',
          detailsHeading: 'Your Request',
          referenceLabel: 'Reference',
          dateLabel: 'Dates',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Your Request');
      expect(json).toContain('100006'); // TotalGuests field ID
    });

    it('should handle single date (no checkout)', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'Request received',
          greeting: 'Hi',
          message: 'We got your request.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          dateLabel: 'Date',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
    });
  });
});

// ============================================================================
// E-commerce Templates
// ============================================================================

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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
          totalPrice: 'Order.Total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Summary');
      expect(json).toContain('200001'); // CustomerName field ID
      expect(json).toContain('200002'); // OrderRef field ID
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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
          totalPrice: 'Order.Total',
          items: 'Order.Items',
          shippingAddress: 'Order.ShippingAddress',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Items');
      expect(json).toContain('Ship to');
      expect(json).toContain('200004'); // Items field ID
      expect(json).toContain('200005'); // ShippingAddress field ID
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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
          totalPrice: 'Order.Total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      // Should NOT have items/shipping labels
      expect(json).not.toContain('Items');
      expect(json).not.toContain('Ship to');
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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
          trackingNumber: 'Order.TrackingNumber',
          estimatedDelivery: 'Order.EstimatedDelivery',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Track Package');
      expect(json).toContain('https://track.example.com');
      expect(json).toContain('200006'); // TrackingNumber field ID
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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
        },
      });

      assertValidRCMLDocument(doc);
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
          firstName: 'Order.CustomerName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Return to Cart');
      expect(json).toContain('https://shop.example.com/cart');
      expect(json).toContain('left some items');
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
          firstName: 'Order.CustomerName',
          orderRef: 'Order.OrderRef',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Cancelled');
      expect(json).toContain('Shop Again');
      expect(json).toContain('200002'); // OrderRef field ID
    });
  });
});

// ============================================================================
// Footer localization across templates
// ============================================================================

describe('Template Footer Localization', () => {
  it('should pass footer config through to templates', () => {
    const doc = createReservationConfirmationEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://example.com',
      footer: {
        viewInBrowserText: 'Voir dans le navigateur',
        unsubscribeText: 'Se désabonner',
      },
      text: {
        preheader: 'Merci!',
        greeting: 'Bonjour',
        intro: 'Merci pour votre réservation.',
        detailsHeading: 'Détails',
        referenceLabel: 'Réf',
        serviceLabel: 'Service',
        checkInLabel: 'Arrivée',
        guestsLabel: 'Personnes',
        ctaButton: 'Voir',
      },
      fieldNames: {
        firstName: 'Booking.FirstName',
        bookingRef: 'Booking.BookingRef',
        serviceType: 'Booking.ServiceType',
        checkInDate: 'Booking.CheckInDate',
        totalGuests: 'Booking.TotalGuests',
      },
    });

    const json = docToString(doc);
    expect(json).toContain('Voir dans le navigateur');
    expect(json).toContain('Se désabonner');
    expect(json).not.toContain('View in browser');
  });
});
