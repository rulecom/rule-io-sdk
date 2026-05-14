export interface CustomField {
  id: number;
  name: string;
  type: string;
}

export interface GetCustomFieldGroupResponse {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  fields: CustomField[];
}
