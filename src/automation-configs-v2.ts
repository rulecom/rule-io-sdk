/**
 * Automation Configuration Definitions (v2)
 *
 * Uses the new brand-based templates with proper placeholder nodes.
 *
 * @module automation-configs-v2
 */

import { RuleTags } from './constants';
import type { RCMLDocument } from './types';
import {
  createBookingConfirmationEmail,
  createBookingCancellationEmail,
  createBookingReminderEmail,
  createAbandonedBookingEmail,
  createPostStayFeedbackEmail,
  createBookingRequestEmail,
  BLACKSTA_BRAND_STYLE,
  BLACKSTA_CUSTOM_FIELDS,
  type BrandStyleConfig,
  type CustomFieldMap,
} from './rcml';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for building templates
 */
export interface TemplateConfigV2 {
  /** Brand style configuration */
  brandStyle: BrandStyleConfig;
  /** Custom field ID mapping */
  customFields: CustomFieldMap;
  /** Website base URL */
  websiteUrl: string;
}

/**
 * Full automation configuration
 */
export interface AutomationConfigV2 {
  /** Unique identifier for this automation */
  id: string;
  /** Display name in Rule.io */
  name: string;
  /** Description of what this automation does */
  description: string;
  /** Tag that triggers this automation */
  triggerTag: string;
  /** Delay before sending (seconds as string) */
  delayInSeconds?: string;
  /** Optional conditions for execution */
  conditions?: {
    hasTag?: string[];
    notHasTag?: string[];
  };
  /** Email subject */
  subject: string;
  /** Preview text shown in inbox */
  preheader?: string;
  /** Function to build the RCML template */
  templateBuilder: (config: TemplateConfigV2) => RCMLDocument;
}

// ============================================================================
// Automation Configurations
// ============================================================================

/**
 * All booking automations using brand-based templates
 */
export const BOOKING_AUTOMATIONS_V2: AutomationConfigV2[] = [
  {
    id: 'booking-confirmation',
    name: 'Bokningsbekräftelse',
    description: 'Skickas när en bokning bekräftas',
    triggerTag: RuleTags.BOOKING_CONFIRMED,
    subject: 'Bokningsbekräftelse',
    preheader: 'Tack för din bokning hos Blacksta Vingård!',
    templateBuilder: (config) =>
      createBookingConfirmationEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
  {
    id: 'booking-request-confirmation',
    name: 'Förfrågningsbekräftelse',
    description: 'Skickas när en bokningsförfrågan tas emot (lågsäsong)',
    triggerTag: RuleTags.BOOKING_REQUEST,
    subject: 'Vi har mottagit din förfrågan',
    preheader: 'Vi återkommer inom kort med bekräftelse',
    templateBuilder: (config) =>
      createBookingRequestEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
  {
    id: 'booking-cancellation',
    name: 'Avbokning',
    description: 'Skickas när en bokning avbokas',
    triggerTag: RuleTags.BOOKING_CANCELLED,
    subject: 'Bokning avbokad',
    preheader: 'Din bokning har avbokats',
    templateBuilder: (config) =>
      createBookingCancellationEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
  {
    id: 'booking-reminder',
    name: 'Påminnelse',
    description: 'Skickas 1 dag före incheckning',
    triggerTag: RuleTags.BOOKING_REMINDER,
    subject: 'Din vistelse börjar snart!',
    preheader: 'Påminnelse: Din vistelse på Blacksta Vingård börjar snart',
    templateBuilder: (config) =>
      createBookingReminderEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
  {
    id: 'abandoned-booking',
    name: 'Övergiven bokning',
    description: 'Skickas 2 timmar efter att en bokning påbörjats men inte slutförts',
    triggerTag: RuleTags.BOOKING_STARTED,
    delayInSeconds: '7200', // 2 hours
    conditions: {
      notHasTag: [RuleTags.BOOKING_CONFIRMED, RuleTags.BOOKING_REQUEST],
    },
    subject: 'Glömde du något?',
    preheader: 'Din bokning väntar på dig',
    templateBuilder: (config) =>
      createAbandonedBookingEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
  {
    id: 'post-stay-feedback',
    name: 'Feedback efter vistelse',
    description: 'Skickas dagen efter utcheckning',
    triggerTag: RuleTags.BOOKING_COMPLETED,
    subject: 'Tack för ditt besök!',
    preheader: 'Vi hoppas att du hade en fantastisk upplevelse',
    templateBuilder: (config) =>
      createPostStayFeedbackEmail({
        brandStyle: config.brandStyle,
        customFields: config.customFields,
        websiteUrl: config.websiteUrl,
      }),
  },
];

/**
 * Default template configuration for Blacksta Vingård
 */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfigV2 = {
  brandStyle: BLACKSTA_BRAND_STYLE,
  customFields: BLACKSTA_CUSTOM_FIELDS,
  websiteUrl: 'https://blackstavingard.se',
};

/**
 * Get automation by ID
 */
export function getAutomationByIdV2(id: string): AutomationConfigV2 | undefined {
  return BOOKING_AUTOMATIONS_V2.find((a) => a.id === id);
}

/**
 * Get automation by trigger tag
 */
export function getAutomationByTriggerV2(tag: string): AutomationConfigV2 | undefined {
  return BOOKING_AUTOMATIONS_V2.find((a) => a.triggerTag === tag);
}
