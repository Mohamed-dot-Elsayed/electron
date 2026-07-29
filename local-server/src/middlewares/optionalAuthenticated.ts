import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { RoleModel } from "../models/roles";
import { UserModel } from "../models/user";
import { UserPermission } from "../types/custom";
import { MODULES, ACTION_NAMES } from "../types/constant";

export async function optionalAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      // If token is invalid, treat as guest
      return next();
    }

    if (!decoded) {
      return next();
    }

    // ✅ جيب الـ permissions من الـ DB (نفس منطق authenticated.ts)
    let permissions: UserPermission[] = [];

    if (
      decoded.role === "superadmin" ||
      (decoded.role === "admin" && !!decoded.warehouse_id && !decoded.role_id)
    ) {
      permissions = MODULES.map((mod) => ({
        module: mod,
        actions: ACTION_NAMES.map((actionName, index) => ({
          id: `${decoded.role}_${mod}_${index}`,
          action: actionName,
        })),
      }));
    } else if (decoded.role_id) {
      const [roleData, userData] = await Promise.all([
        RoleModel.findById(decoded.role_id),
        UserModel.findById(decoded.id),
      ]);

      const rolePermissions = (roleData?.permissions || []).map((p: any) => ({
        module: p.module,
        actions: (p.actions || []).map((a: any) => ({
          id: a._id?.toString() || "",
          action: a.action || "",
        })),
      }));

      const userPermissions = (userData?.permissions || []).map((p: any) => ({
        module: p.module,
        actions: (p.actions || []).map((a: any) => ({
          id: a._id?.toString() || "",
          action: a.action || "",
        })),
      }));

      permissions = mergePermissions(rolePermissions, userPermissions);
    }

    // ✅ حط الـ user + permissions في الـ request
    req.user = {
      ...decoded,
      permissions,
    };

    next();
  } catch (error) {
    // In case of any error during DB fetch, still proceed as guest or handle error?
    // Usually, if there's a token but we fail to fetch user data, it might be safer to just next()
    next();
  }
}

function mergePermissions(
  rolePermissions: UserPermission[],
  userPermissions: UserPermission[]
): UserPermission[] {
  const permissionMap = new Map<string, Map<string, { id: string; action: string }>>();

  rolePermissions.forEach((p) => {
    if (!permissionMap.has(p.module)) {
      permissionMap.set(p.module, new Map());
    }
    p.actions.forEach((a) => {
      permissionMap.get(p.module)!.set(a.action, a);
    });
  });

  userPermissions.forEach((p) => {
    if (!permissionMap.has(p.module)) {
      permissionMap.set(p.module, new Map());
    }
    p.actions.forEach((a) => {
      permissionMap.get(p.module)!.set(a.action, a);
    });
  });

  const result: UserPermission[] = [];
  permissionMap.forEach((actionsMap, module) => {
    result.push({
      module,
      actions: Array.from(actionsMap.values()),
    });
  });

  return result;
}
