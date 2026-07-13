// src/models/schema/admin/Role.ts

import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"
import { MODULES, ACTION_NAMES, ModuleName, ActionName } from "../types/constant";

// Permission Action schema
const PermissionActionSchema: SchemaDef = {
  action: {
    type: "string",
    enum: ACTION_NAMES as unknown as string[],
    required: true,
  },
};

// Role Permission schema (module + actions)
const RolePermissionSchema: SchemaDef = {
  module: {
    type: "string",
    enum: MODULES as unknown as string[],
    required: true,
  },
  actions: {
    type: "array",
    items: {
      type: "object",
      schema: PermissionActionSchema,
    },
    default: [],
  },
};

// Main Role schema
const RoleSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
    // Note: trim not supported, handle in application logic
  },
  status: {
    type: "string",
    enum: ["active", "inactive"],
    default: "active",
  },
  permissions: {
    type: "array",
    items: {
      type: "object",
      schema: RolePermissionSchema,
    },
    default: [],
  },
};

// Create the model
export const RoleModel = createModel("Role", RoleSchema, {
  timestamps: true,
});