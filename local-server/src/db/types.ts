export type PrimitiveType =
  | "string"
  | "number"
  | "boolean"
  | "date";

export type PrimitiveValue =
  | string
  | number
  | boolean
  | Date;

export interface BaseField {
  required?: boolean;
  unique?: boolean;
  default?: any;
  enum?: PrimitiveValue[];
  ref?: string;
}

export interface PrimitiveField extends BaseField {
  type: PrimitiveType;
}

export interface ObjectField extends BaseField {
  type: "object";
  schema: SchemaDef;
}

export interface ArrayField extends BaseField {
  type: "array";
  items: FieldDef;
}

export type FieldDef =
  | PrimitiveField
  | ObjectField
  | ArrayField;

export type SchemaDef = Record<string, FieldDef>;

export interface ModelOptions {
  timestamps?: boolean;
}

export type Where = Record<string, any>;