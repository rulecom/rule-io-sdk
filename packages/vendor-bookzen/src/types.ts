// TODO: move the content of this file to the packages/core/src/vendor-types.ts after all vendors are refactored
export type VendorFieldDefinition = {
  /** The Rule.io custom field group name (e.g. "Subscriber", "Booking"). */
  groupName: string;

  /** The Rule.io custom field name (e.g. "FirstName", "CheckInDate"). */
  fieldName: string;

  /** Whether this field is historical (append-only) or current (overwritten). */
  historical: boolean;

  /** Human-readable description of the field. */
  description: string;
};

export type VendorFieldSchema = {
  [vendorFieldName: string]: VendorFieldDefinition;
}

export type ResolvedVendorField = VendorFieldDefinition & {
  /** The Rule.io custom field ID. */
  id: number;
  /** The Rule.io custom field type (e.g. "text", "number"). */
  type: string;
};