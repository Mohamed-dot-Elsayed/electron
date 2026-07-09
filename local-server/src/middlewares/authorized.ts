import { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";

export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      throw new UnauthorizedError("You are not authorized to access this resource");
    }
    next();
  };
};


// import { UnauthorizedError } from "../Errors/unauthorizedError";
// import { AuthenticatedRequest } from "../types/custom";

// // authorize.ts
// import { Request, Response, NextFunction } from "express";

// export const authorize = (moduleName: string, actionName?: string) => {
//   return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
//     const user = req.user;

//     if (!user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // ✅ superadmin يعدي على كل حاجة
//     if (user.role === "superadmin") {
//       return next();
//     }

//     // ✅ admin: لازم نتحقق من الـ module + action
//     if (user.role === "admin") {
//       // هل عنده role على الموديول ده؟
//       const hasRole = user.roles.includes(moduleName);

//       if (!hasRole) {
//         return res.status(403).json({ message: `Forbidden: Missing role for ${moduleName}` });
//       }

//       // لو actionName مطلوب (زي add, update ...)
//       if (actionName) {
//         const hasAction = user.actions.includes(actionName);

//         if (!hasAction) {
//           return res.status(403).json({ message: `Forbidden: Missing action ${actionName}` });
//         }
//       }

//       return next();
//     }

//     // غير كده مرفوض
//     return res.status(403).json({ message: "Forbidden: Invalid role" });
//   };
// };
