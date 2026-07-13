// src/models/schema/admin/User.ts

import { createModel } from "../db/createModel";
import {SchemaDef} from '../db/types';
import { MODULES, ACTION_NAMES, ModuleName, ActionName } from "../types/constant";

// Define the Permission schema types
const PermissionActionSchema: SchemaDef = {
  action: {
    type: "string",
    required: true,
    enum: ACTION_NAMES as unknown as string[],
  },
};

const PermissionSchema: SchemaDef = {
  module: {
    type: "string",
    required: true,
    enum: MODULES as unknown as string[],
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

// Main User schema
const UserSchema: SchemaDef = {
  username: {
    type: "string",
    required: true,
    unique: true,
  },
  email: {
    type: "string",
    required: true,
    unique: true,
    // Note: lowercase and trim need to be handled in application logic
  },
  password_hash: {
    type: "string",
    required: true,
  },
  company_name: {
    type: "string",
  },
  phone: {
    type: "string",
  },
  role_id: {
    type: "string", // UUID reference to Role
    ref: "Role",
  },
  role: {
    type: "string",
    enum: ["superadmin", "admin"],
    default: "admin",
  },
  permissions: {
    type: "array",
    items: {
      type: "object",
      schema: PermissionSchema,
    },
    default: [],
  },
  status: {
    type: "string",
    enum: ["active", "inactive"],
    default: "active",
  },
  image_url: {
    type: "string",
  },
  address: {
    type: "string",
  },
  vat_number: {
    type: "string",
  },
  state: {
    type: "string",
  },
  postal_code: {
    type: "string",
  },
  warehouse_id: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
  },
};

// Create the model
export const UserModel = createModel("User", UserSchema, {
  timestamps: true, // This will add createdAt and updatedAt
});