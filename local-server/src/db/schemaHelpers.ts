import { getModelSchema } from "./model-registry";

export function isIncrementalField(tableName: string, field: string): boolean {
  const schema = getModelSchema(tableName);
  if (!schema) return false;

  const def = schema[field];
  return !!def && "incremental" in def && def.incremental === true;
}