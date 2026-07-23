import { randomUUID } from "crypto";
import { getDB, saveDB, registerTable } from "./db";
import {
  SchemaDef,
  FieldDef,
  PrimitiveField,
  ModelOptions,
  Where,
} from "./types";
import { registerModelSchema } from "./model-registry";

const sqlType = {
  string: "TEXT",
  number: "REAL",
  boolean: "INTEGER",
  date: "TEXT",
  object: "TEXT",
  array: "TEXT",
} as const;

type FindOptions = {
  sort?: Record<string, 1 | -1>;
  limit?: number;
};

function applyDefaults(schema: SchemaDef, data: any): any {
  const result = { ...data };

  for (const [key, def] of Object.entries(schema)) {
    if (result[key] !== undefined) continue;

    if (def.default !== undefined) {
      result[key] =
        typeof def.default === "function"
          ? def.default()
          : structuredClone(def.default);
    }
  }

  return result;
}

function validatePrimitive(key: string, def: PrimitiveField, value: any) {
  if (value === undefined || value === null) {
    if (def.required) throw new Error(`${key} is required`);
    return;
  }

  switch (def.type) {
    case "string":
      if (typeof value !== "string") throw new Error(`${key} must be string`);
      break;

    case "number":
      if (typeof value !== "number") throw new Error(`${key} must be number`);
      break;

    case "boolean":
      if (typeof value !== "boolean") throw new Error(`${key} must be boolean`);
      break;

    case "date":
      if (!(value instanceof Date) && typeof value !== "string")
        throw new Error(`${key} must be Date`);
      break;
  }

  if (def.enum && !def.enum.includes(value))
    throw new Error(`${key} must be one of ${def.enum.join(", ")}`);
}

function validateField(
  key: string,
  def: FieldDef,
  value: any,
  partial = false
) {
  if (value === undefined) {
    if (!partial && def.required) {
      throw new Error(`${key} is required`);
    }

    return;
  }

  if (value === null) {
    if (def.required) {
      throw new Error(`${key} is required`);
    }

    return;
  }

  if (def.type !== "object" && def.type !== "array") {
    validatePrimitive(key, def, value);
    return;
  }

  if (def.type === "object") {
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${key} must be object`);
    }

    validateSchema(def.schema, value, partial);

    return;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be array`);
  }

  for (const item of value) {
    validateField(`${key}[]`, def.items, item, partial);
  }
}

function validateSchema(schema: SchemaDef, data: any, partial = false) {
  for (const [key, def] of Object.entries(schema)) {
    validateField(key, def, data[key], partial);
  }
}

function serializeField(def: FieldDef, value: any): any {
  if (value === undefined || value === null) {
    // Return null for SQL instead of undefined
    if (def.type === "object" || def.type === "array") {
      return null;
    }
    return null;
  }

  switch (def.type) {
    case "boolean":
      return value ? 1 : 0;

    case "date":
      return value instanceof Date ? value.toISOString() : value;

    case "object":
    case "array":
      // Ensure we always have a valid JSON string
      if (value === undefined || value === null) {
        return null;
      }
      return JSON.stringify(value);

    default:
      return value;
  }
}

function deserializeField(def: FieldDef, value: any): any {
  if (value === undefined || value === null) return value;

  switch (def.type) {
    case "boolean":
      return Boolean(value);

    case "date":
      return new Date(value);

    case "object":
    case "array":
      // Handle empty strings, null, or invalid JSON
      if (typeof value !== "string" || value.trim() === "") {
        return def.type === "array" ? [] : {};
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error(
          `Failed to parse JSON for field type ${def.type}:`,
          value
        );
        return def.type === "array" ? [] : {};
      }

    default:
      return value;
  }
}

function serializeRow(schema: SchemaDef, row: any) {
  const result: any = {};

  for (const key of Object.keys(row)) {
    const def = schema[key];

    if (!def) {
      result[key] = row[key];
      continue;
    }

    result[key] = serializeField(def, row[key]);
  }

  return result;
}

export function deserializeRow(schema: SchemaDef, row: any) {
  const result: any = {};

  for (const [key, value] of Object.entries(row)) {
    const def = schema[key];

    if (!def) {
      result[key] = value;
      continue;
    }

    result[key] = deserializeField(def, value);
  }

  return result;
}

function addNestedIds(def: FieldDef, value: any): any {
  if (value === undefined || value === null) return value;

  if (def.type === "array") {
    if (!Array.isArray(value)) return value;

    return value.map((item) => addNestedIds(def.items, item));
  }

  if (def.type === "object") {
    const obj = { ...value };

    if (obj._id === undefined) {
      obj._id = randomUUID();
    }

    for (const [key, childDef] of Object.entries(def.schema)) {
      if (obj[key] !== undefined) {
        obj[key] = addNestedIds(childDef, obj[key]);
      }
    }

    return obj;
  }

  return value;
}

function buildWhere(where: Where) {
  const clauses: string[] = [];
  const values: any[] = [];

  for (const [key, raw] of Object.entries(where)) {
    if (raw === undefined) continue;

    // Operator object: { $in: [...] }, { $ne: x }, etc.
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      const opEntries = Object.entries(raw);

      for (const [op, val] of opEntries) {
        switch (op) {
          case "$in": {
            const arr = val as any[];
            if (!arr.length) {
              // empty $in should match nothing
              clauses.push("1 = 0");
            } else {
              clauses.push(`${key} IN (${arr.map(() => "?").join(",")})`);
              values.push(...arr);
            }
            break;
          }
          case "$nin": {
            const arr = val as any[];
            if (arr.length) {
              clauses.push(`${key} NOT IN (${arr.map(() => "?").join(",")})`);
              values.push(...arr);
            }
            break;
          }
          case "$ne":
            clauses.push(`${key} != ?`);
            values.push(val);
            break;
          case "$gt":
            clauses.push(`${key} > ?`);
            values.push(val);
            break;
          case "$gte":
            clauses.push(`${key} >= ?`);
            values.push(val);
            break;
          case "$lt":
            clauses.push(`${key} < ?`);
            values.push(val);
            break;
          case "$lte":
            clauses.push(`${key} <= ?`);
            values.push(val);
            break;
          case "$contains": {
            // val is the single item we're checking for membership in a JSON array column
            clauses.push(`EXISTS (
              SELECT 1 FROM json_each(${key}) WHERE json_each.value = ?
            )`);
            values.push(val);
            break;
          }
          default:
            throw new Error(`Unsupported operator "${op}" on field "${key}"`);
        }
      }
      continue;
    }

    // Plain equality
    clauses.push(`${key} = ?`);
    values.push(raw);
  }

  if (!clauses.length) {
    return { clause: "", values: [] };
  }

  return {
    clause: "WHERE " + clauses.join(" AND "),
    values,
  };
}

function normalizeSparseFields(schema: SchemaDef, data: any) {
  const result = { ...data };

  for (const [key, def] of Object.entries(schema)) {
    if (
      def.type === "string" &&
      (def as PrimitiveField).sparse &&
      result[key] === ""
    ) {
      result[key] = null;
    }
  }

  return result;
}

/**
 * Converts an array of values to types that can be safely bound to a SQLite statement.
 * - undefined -> null
 * - null, string, number, boolean are passed through
 * - anything else throws an error (unless you need Buffer/Uint8Array support)
 */
type SqlBindable = number | string | null | Uint8Array;

export function sanitizeBindValues(
  values: unknown[]
): (number | string | null | Uint8Array)[] {
  return values.map((v) => {
    if (v === undefined) return null;
    if (v === null) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "number" || typeof v === "string") return v;
    if (v instanceof Uint8Array) return v;

    // ✅ New: object/array → JSON string (mirrors the ORM’s serializeField)
    if (typeof v === "object") {
      return JSON.stringify(v);
    }

    // Anything else (function, symbol, etc.) should not be bound
    throw new TypeError(
      `Cannot bind value of type ${typeof v}: ${JSON.stringify(v)}`
    );
  });
}

export function createModel(
  tableName: string,
  schema: SchemaDef,
  options: ModelOptions = {}
) {
  const timestamps = options.timestamps ?? true;

  // Create table
  const columns = ["_id TEXT PRIMARY KEY"];

  for (const [field, def] of Object.entries(schema)) {
    let column = `${field} ${sqlType[def.type]}`;

    if (def.required) column += " NOT NULL";

    if (def.unique) column += " UNIQUE";

    if (def.enum) {
      column += ` CHECK(${field} IN (${def.enum
        .map((v) => `'${v}'`)
        .join(",")}))`;
    }

    columns.push(column);
  }

  if (timestamps) {
    columns.push(
      "createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
    );
  }

  registerTable(
    `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")});`
  );
  registerModelSchema(tableName, schema);
  function rowsFrom(where: Where = {}, options: FindOptions = {}) {
    const db = getDB();
    const { clause, values } = buildWhere(where);
    let sql = `SELECT * FROM ${tableName} ${clause}`;

    if (options.sort) {
      const orderClauses = Object.entries(options.sort).map(
        ([field, dir]) => `${field} ${dir === -1 ? "DESC" : "ASC"}`
      );
      sql += ` ORDER BY ${orderClauses.join(", ")}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    const stmt = db.prepare(sql);

    // Filter out undefined values
    const safeValues = sanitizeBindValues(values);

    try {
      stmt.bind(safeValues);
    } catch (error) {
      console.error("Bind error:", { values, safeValues, clause });
      throw error;
    }

    const rows: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(deserializeRow(schema, row));
    }
    stmt.free();
    return rows;
  }

  return {
    find(where: Where = {}, options: FindOptions = {}) {
      return rowsFrom(where, options);
    },

    findOne(where: Where = {}, options: FindOptions = {}) {
      return rowsFrom(where, { ...options, limit: 1 })[0] ?? null;
    },

    findById(id: string) {
      return this.findOne({
        _id: id,
      });
    },

    count(where: Where = {}) {
      return rowsFrom(where).length;
    },

    create(data: Record<string, any>) {
      const db = getDB();

      // Clean the input data - remove undefined values
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      // Apply defaults
      let row = applyDefaults(schema, cleanData);
      row = normalizeSparseFields(schema, row);

      for (const [key, def] of Object.entries(schema)) {
        if (row[key] !== undefined) {
          row[key] = addNestedIds(def, row[key]);
        } else if (def.type === "array") {
          // Ensure arrays are never undefined
          row[key] = [];
        } else if (def.type === "object") {
          // Ensure objects are never undefined
          row[key] = {};
        }
      }

      // Validate
      validateSchema(schema, row);

      // Set _id (prefer _id, then id, otherwise generate one)
      row._id = row._id ?? data.id ?? randomUUID();

      if (timestamps) {
        const now = new Date().toISOString();
        row.createdAt = now;
        row.updatedAt = now;
      }
      
      // Convert object/array/date/bool
      const serialized = serializeRow(schema, row);

      const keys = Object.keys(row);

      db.run(
        `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${keys
          .map(() => "?")
          .join(", ")})`,
        keys.map((key) => serialized[key])
      );

      saveDB();

      return deserializeRow(schema, row);
    },

    updateOne(where: Where, data: Record<string, any>) {
      const target = this.findOne(where);
      if (!target) return null;

      // Clean the input data - remove undefined values
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      const normalizedData = normalizeSparseFields(schema, cleanData);
      validateSchema(schema, normalizedData, true);

      const patch = { ...normalizedData };

      if (timestamps) {
        patch.updatedAt = new Date().toISOString();
      }

      const serialized = serializeRow(schema, patch);
      const keys = Object.keys(patch);

      const db = getDB();
      db.run(
        `UPDATE ${tableName} SET ${keys
          .map((key) => `${key} = ?`)
          .join(", ")} WHERE _id = ?`,
        [...keys.map((key) => serialized[key]), target._id]
      );

      saveDB();
      return this.findById(target._id);
    },

    updateById(id: string, data: Record<string, any>) {
      return this.updateOne(
        {
          _id: id,
        },
        data
      );
    },

    deleteOne(where: Where) {
      const target = this.findOne(where);

      if (!target) return null;

      const db = getDB();

      db.run(
        `
      DELETE FROM ${tableName}
      WHERE _id = ?
      `,
        [target._id]
      );

      saveDB();

      return target;
    },

    deleteById(id: string) {
      return this.deleteOne({
        _id: id,
      });
    },
  };
}
