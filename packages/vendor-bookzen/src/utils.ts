import { CustomFieldRef } from '@rulecom/template-engine';
import type { ResolvedVendorField } from './types.js';


export function vendorToCustomFieldRef(resolvedVendorField: ResolvedVendorField): CustomFieldRef {
  const { groupName, fieldName, id } = resolvedVendorField;

  return new CustomFieldRef(groupName, fieldName, id);
}