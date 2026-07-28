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
  sparse?: boolean;
  ref?: string;
  incremental?: boolean;
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

export type WhereOperator<T = any> = {
  $in?: T[];
  $nin?: T[];
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
};

export type Where = Record<string, any | WhereOperator>;