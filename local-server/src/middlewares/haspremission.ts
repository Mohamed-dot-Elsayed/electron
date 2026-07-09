import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { ModuleName, ActionName } from "../types/constant";

export const authorizePermissions = (module: ModuleName, action: ActionName) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Superadmin bypasses all checks
    if (user.role === "superadmin") {
      return next();
    }

    const modulePermission = user.permissions?.find((p) => p.module === module);

    if (!modulePermission) {
      throw new UnauthorizedError(`No access to ${module} module`);
    }

    const hasAction = modulePermission.actions.some((a) => a.action === action);

    if (!hasAction) {
      throw new UnauthorizedError(`No permission to ${action} in ${module}`);
    }

    next();
  };
};
