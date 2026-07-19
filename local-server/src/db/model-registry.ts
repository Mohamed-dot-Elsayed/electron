import { SchemaDef } from "./types";

const schemaMap = new Map<string, SchemaDef>();

export function registerModelSchema(tableName: string, schema: SchemaDef) {
  schemaMap.set(tableName, schema);
}

export function getModelSchema(tableName: string): SchemaDef | undefined {
  return schemaMap.get(tableName);
}