export type CustomFieldType = 'text' | 'textarea' | 'select' | 'date' | 'tel' | 'email' | 'number' | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  section: string;
  order: number;
}

export interface CustomFieldValue {
  definition_id: string;
  label: string;
  value: string | boolean;
  type: CustomFieldType;
}
