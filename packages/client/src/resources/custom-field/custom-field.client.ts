import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import type { GetCustomFieldGroupResponse } from './custom-field.types.js';


export class CustomFieldClient extends BaseResource {
  async getGroupById(id: number): Promise<GetCustomFieldGroupResponse | null> {
    try {
      return await this.transport.get<GetCustomFieldGroupResponse>(
        `/customizations/${ id }`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.isNotFound()) {
        return null;
      }

      throw error;
    }
  }

  async getGroupByName(name: string): Promise<GetCustomFieldGroupResponse | null> {
    try {
      return await this.transport.get<GetCustomFieldGroupResponse>(
        `/customizations/${ encodeURIComponent(name) }`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.isNotFound()) {
        return null;
      }

      throw error;
    }
  }
}
