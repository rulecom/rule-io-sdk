/**
 * Custom-field-data types (v3 `/custom-field-data/*` endpoints).
 *
 * The Custom Field Data API is deprecated by Rule.io but kept for back-compat
 * with consumers (e.g. the CLI deploy commands) that still rely on it.
 */

import type { RuleApiResponse } from '../../shared.types.js';

/**
 * Value types supported by custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export type CustomFieldValue =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[];

/**
 * A single custom field value within a custom field data record.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldValue {
  field_id: number;
  field_name: string;
  field_type: 'text' | 'datetime' | 'date' | 'time' | 'multiple' | 'json';
  field_value: CustomFieldValue;
}

/**
 * A custom field data record representing a group of field values for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataRecord {
  id: number;
  group_id?: number;
  group_name?: string;
  historical?: boolean;
  created_at?: string;
  values: RuleCustomFieldValue[];
}

/**
 * Response for custom field data list endpoints.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataResponse extends RuleApiResponse {
  data?: RuleCustomFieldDataRecord[];
  meta?: { page: number; per_page: number };
}

/**
 * Response for custom field data single-record endpoints.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataSingleResponse extends RuleApiResponse {
  data?: RuleCustomFieldDataRecord;
}

/**
 * Query parameters for listing custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataListParams {
  page?: number;
  per_page?: number;
  groups_id?: number[];
  groups_name?: string[];
}

/**
 * Query parameters for retrieving custom field data by group.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataGroupParams {
  page?: number;
  per_page?: number;
  fields?: string[];
}

export interface CustomFieldDataEntry {
  field: number | string;
  create_if_not_exists?: boolean;
  value: CustomFieldValue;
}

/**
 * A single group entry in a create-custom-field-data request.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface CustomFieldGroupDataEntry {
  group: number | string;
  create_if_not_exists?: boolean;
  historical?: boolean;
  values: Array<CustomFieldDataEntry>;
}

/**
 * Request body for creating custom field data for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface CreateCustomFieldDataRequestBody {
  groups: Array<CustomFieldGroupDataEntry>;
}

/**
 * Request body for updating custom field data for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataUpdateRequest {
  identifier: {
    data_id?: number;
    group?: number | string;
    field?: number | string;
    value?: string;
  };
  values: Array<{
    field: number | string;
    create_if_not_exists?: boolean;
    value: CustomFieldValue;
  }>;
}

/**
 * Query parameters for searching custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataSearchParams {
  data_id?: number;
  group?: number | string;
  field?: number | string;
  value?: string;
}
