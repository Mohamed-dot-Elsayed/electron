import { randomUUID } from "crypto";
import { getDB, saveDB, registerTable } from "./db";
import {
  SchemaDef,
  FieldDef,
  PrimitiveField,
  ModelOptions,
  Where,
} from "./types";

const sqlType = {
  string: "TEXT",
  number: "REAL",
  boolean: "INTEGER",
  date: "TEXT",
  object: "TEXT",
  array: "TEXT",
} as const;

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
    if (
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error(`${key} must be object`);
    }


    validateSchema(
      def.schema,
      value,
      partial
    );

    return;
  }


  if (!Array.isArray(value)) {
    throw new Error(`${key} must be array`);
  }


  for (const item of value) {
    validateField(
      `${key}[]`,
      def.items,
      item,
      partial
    );
  }
}

function validateSchema(
  schema: SchemaDef,
  data: any,
  partial = false
) {
  for (const [key, def] of Object.entries(schema)) {
    validateField(
      key,
      def,
      data[key],
      partial
    );
  }
}

function serializeField(def: FieldDef, value: any): any {
  if (value === undefined || value === null) return value;

  switch (def.type) {
    case "boolean":
      return value ? 1 : 0;

    case "date":
      return value instanceof Date ? value.toISOString() : value;

    case "object":
    case "array":
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
      return JSON.parse(value);

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

function deserializeRow(schema: SchemaDef, row: any) {
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
  const keys = Object.keys(where);

  if (!keys.length)
    return {
      clause: "",
      values: [],
    };

  return {
    clause: "WHERE " + keys.map((k) => `${k} = ?`).join(" AND "),

    values: keys.map((k) => where[k]),
  };
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
    columns.push("createdAt TEXT NOT NULL", "updatedAt TEXT NOT NULL");
  }

  registerTable(
    `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")});`
  );

  function rowsFrom(where: Where = {}) {
    const db = getDB();

    const { clause, values } = buildWhere(where);

    const stmt = db.prepare(`SELECT * FROM ${tableName} ${clause}`);

    stmt.bind(values);

    const rows: any[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();

      rows.push(deserializeRow(schema, row));
    }

    stmt.free();

    return rows;
  }

  return {
    find(where: Where = {}) {
      return rowsFrom(where);
    },

    findOne(where: Where = {}) {
      return rowsFrom(where)[0] ?? null;
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

      // apply defaults
      let row = applyDefaults(schema, data);

      for (const [key, def] of Object.entries(schema)) {
        if (row[key] !== undefined) {
          row[key] = addNestedIds(def, row[key]);
        }
      }

      // validate
      validateSchema(schema, row);

      row = {
        _id: randomUUID(),
        ...row,
      };

      if (timestamps) {
        const now = new Date().toISOString();

        row.createdAt = now;
        row.updatedAt = now;
      }

      // convert object/array/date/bool
      const serialized = serializeRow(schema, row);

      const keys = Object.keys(row);

      db.run(
        `
      INSERT INTO ${tableName}
      (${keys.join(", ")})
      VALUES (${keys.map(() => "?").join(", ")})
      `,
        keys.map((key) => serialized[key])
      );

      saveDB();

      return deserializeRow(schema, row);
    },

    updateOne(where: Where, data: Record<string, any>) {
      const target = this.findOne(where);

      if (!target) return null;

      validateSchema(schema, data,true);

      const patch = {
        ...data,
      };

      if (timestamps) {
        patch.updatedAt = new Date().toISOString();
      }

      const serialized = serializeRow(schema, patch);

      const keys = Object.keys(patch);

      const db = getDB();

      db.run(
        `
      UPDATE ${tableName}
      SET ${keys.map((key) => `${key} = ?`).join(", ")}
      WHERE _id = ?
      `,
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
