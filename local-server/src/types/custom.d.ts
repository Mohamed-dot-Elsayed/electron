// src/types/custom.ts
import { Request } from "express";
import { Types } from "mongoose";
import { ModuleName, ActionName } from "../constants/permissions";

export interface PermissionAction {
  id: string;          // جاي من _id بتاع Subdocument
  action: ActionName;  // "view" | "add" | "edit" | "delete"
}

/** Permission per module */
export interface UserPermission {
  module: ModuleName;
  actions: PermissionAction[];
}

/** شكل اليوزر في Mongo */
export interface JwtUserPayload {
  id: string;
  name: string;
  role: "superadmin" | "admin";
  role_id: string | null;
  warehouse_id: string | null;
}

export interface UserPermission {
  module: string;
  actions: {
    id: string;
    action: string;
  }[];
}

export interface AuthenticatedUser extends JwtUserPayload {
  permissions: UserPermission[];
}

export interface AppUser {
  _id: any;
  username: string;
  email: string;
  password_hash: string;
  company_name?: string;
  phone?: string;
  role_id?: any;
  role: "superadmin" | "admin";
  permissions: {
    module: string;
    actions: { _id: any; action: string }[];
  }[];
  status: "active" | "inactive";
  image_url?: string;
  warehouse_id?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export { };
