/**
 * Account types (v3 `/accounts` endpoint).
 */

import type { RuleApiResponse, RuleListResponse } from '../../shared.types.js';

/** Sitoo integration credentials linked to an account. */
export interface RuleSitooCredential {
  account_id: number;
  api_id: string;
  /** Sitoo password. Sensitive: avoid logging or storing in plaintext. */
  password: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Full account representation, including optional nested sub-accounts
 * and Sitoo credentials. Returned by `accounts.get()`.
 */
export interface RuleAccount {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  sitoo_credentials?: RuleSitooCredential[];
  sub_accounts?: RuleAccount[];
}

/**
 * Simplified account representation without nested relations.
 * Returned by `accounts.list()` and `accounts.create()`.
 */
export interface RuleAccountSimple {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Request body for creating an account.
 *
 * Both fields are required by the API.
 */
export interface RuleAccountCreateRequest {
  /** Account name (max 255 characters) */
  name: string;
  /** ISO 639-1 language code (max 2 characters, e.g. "en", "sv") */
  language: string;
}

/** Query parameters for `accounts.get()`. */
export interface RuleAccountGetParams {
  /** Optional relations to include in the response */
  includes?: ('sitoo_credentials')[];
}

/** Response wrapper for a single account. */
export interface RuleAccountResponse extends RuleApiResponse {
  data?: RuleAccount;
}

/** Response wrapper for creating an account. */
export interface RuleAccountCreateResponse extends RuleApiResponse {
  data?: RuleAccountSimple;
}

/** Response wrapper for listing accounts. */
export type RuleAccountListResponse = RuleListResponse<RuleAccountSimple>;
