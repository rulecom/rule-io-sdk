/**
 * Brand-style types (v3 `/brand-styles` endpoint).
 */

import type { RuleApiResponse, RuleListResponse } from '../../shared.types.js';

/** Colour type for a brand style. */
export type RuleBrandStyleColourType = 'accent' | 'dark' | 'light' | 'brand' | 'side';

/** A colour entry within a brand style. */
export interface RuleBrandStyleColour {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleColourType;
  hex: string;
  brightness: number;
  created_at: string;
  updated_at: string;
}

/** Link type for a brand style. */
export type RuleBrandStyleLinkType =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'github'
  | 'youtube'
  | 'linkedin'
  | 'crunchbase'
  | 'website'
  | 'pinterest'
  | 'tiktok';

/** A social/web link within a brand style. */
export interface RuleBrandStyleLink {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleLinkType;
  link: string;
  created_at: string;
  updated_at: string;
}

/** Font type for a brand style. */
export type RuleBrandStyleFontType = 'title' | 'body';

/** Font origin for a brand style. */
export type RuleBrandStyleFontOrigin = 'google' | 'system' | 'custom';

/** A font entry within a brand style. */
export interface RuleBrandStyleFont {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleFontType;
  origin?: RuleBrandStyleFontOrigin | null;
  origin_id?: string | null;
  origin_name?: string | null;
  url?: string | null;
  weights?: string[] | null;
  name: string;
  created_at: string;
  updated_at: string;
}

/** Image type for a brand style. */
export type RuleBrandStyleImageType = 'logo' | 'icon' | 'symbol' | 'banner';

/** An image entry within a brand style. */
export interface RuleBrandStyleImage {
  id: number;
  brand_style_id: number;
  type?: RuleBrandStyleImageType | null;
  public_path?: string | null;
  created_at: string;
  updated_at: string;
}

/** Full brand style detail as returned by GET /brand-styles/{id}. */
export interface RuleBrandStyle {
  id: number;
  account_id: number;
  name: string;
  description?: string | null;
  domain?: string | null;
  is_default: boolean;
  links?: RuleBrandStyleLink[] | null;
  colours?: RuleBrandStyleColour[] | null;
  fonts?: RuleBrandStyleFont[] | null;
  images?: RuleBrandStyleImage[] | null;
  is_fetchable?: boolean | null;
  created_at: string;
  updated_at: string;
}

/** Simplified brand style item as returned by GET /brand-styles (list endpoint). */
export interface RuleBrandStyleListItem {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Request body for creating a brand style from a domain. */
export interface RuleBrandStyleFromDomainRequest {
  domain: string;
}

/** Request body for creating a brand style manually (POST). `name` is required. */
export interface RuleBrandStyleCreateRequest {
  name: string;
  description?: string | null;
  domain?: string | null;
  is_default?: boolean | null;
  colours?: Array<{ type: RuleBrandStyleColourType; hex: string; brightness: number }> | null;
  links?: Array<{ type: RuleBrandStyleLinkType; link: string }> | null;
  fonts?: Array<{
    type: RuleBrandStyleFontType;
    name: string;
    origin: RuleBrandStyleFontOrigin;
    origin_id?: string | null;
    weights?: string[] | null;
    font?: { name?: string; file: string };
  }> | null;
  images?: Array<{
    type: RuleBrandStyleImageType;
    image?: { name?: string; file: string };
  }> | null;
}

/** Request body for updating a brand style (PATCH). All fields are optional. */
export interface RuleBrandStyleUpdateRequest {
  name?: string;
  description?: string | null;
  domain?: string | null;
  is_default?: boolean | null;
  colours?: Array<{ type: RuleBrandStyleColourType; hex: string; brightness: number }> | null;
  links?: Array<{ type: RuleBrandStyleLinkType; link: string }> | null;
  fonts?: Array<{
    type: RuleBrandStyleFontType;
    name: string;
    origin: RuleBrandStyleFontOrigin;
    origin_id?: string | null;
    weights?: string[] | null;
    font?: { name?: string; file: string };
  }> | null;
  images?: Array<{
    type: RuleBrandStyleImageType;
    image?: { name?: string; file: string };
  }> | null;
}

/**
 * @deprecated Use {@link RuleBrandStyleCreateRequest} or {@link RuleBrandStyleUpdateRequest} instead.
 */
export type RuleBrandStyleManualRequest = RuleBrandStyleUpdateRequest;

/** Response for a single brand style (detail). */
export interface RuleBrandStyleResponse extends RuleApiResponse {
  data?: RuleBrandStyle;
}

/** Response for listing brand styles. */
export type RuleBrandStyleListResponse = RuleListResponse<RuleBrandStyleListItem>;
