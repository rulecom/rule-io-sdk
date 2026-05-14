/**
 * Cross-cutting types shared by every namespace.
 */

/**
 * Base shape every API response carries. Most endpoints return a richer
 * shape that extends this; some 204-style endpoints return only `success`.
 */
export interface RuleApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

/** Pagination parameters for v3 list endpoints. */
export interface RulePaginationParams {
  page?: number;
  per_page?: number;
}

/** Generic list response wrapper for v3 endpoints that return arrays. */
export interface RuleListResponse<T> extends RuleApiResponse {
  data?: T[];
}
