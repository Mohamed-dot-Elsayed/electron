import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/user";
import { RoleModel } from "../models/roles";
import { CashierShift } from "../models/cashierShift";
import { generateToken } from "../utils/auth";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../Errors";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";
import { AppUser, UserPermission } from "../types/custom";
import { MODULES, ACTION_NAMES } from "../types/constant";
import { saveBase64Image } from "../utils/handleImages";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequest("Email and password are required");
  }

  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new NotFound("User not found");
  }

  if (user.status !== "active") {
    throw new UnauthorizedError("Your account is not active. Please contact admin.");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash as string);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // ✅ جيب الـ permissions للـ Response (Frontend)
  let mappedPermissions: UserPermission[] = [];
  let roleName: string | null = null;

  if (
    user.role === "superadmin" ||
    (user.role === "admin" && !!user.warehouse_id && !user.role_id)
  ) {
    mappedPermissions = MODULES.map((mod) => ({
      module: mod,
      actions: ACTION_NAMES.map((actionName, index) => ({
        id: `${user.role}_${mod}_${index}`,
        action: actionName,
      })),
    }));

    if (user.role === "admin") {
      roleName = "Warehouse Admin";
    }
  } else if (user.role_id) {
    const roleData = await RoleModel.findById(user.role_id).lean();

    if (!roleData) {
      throw new UnauthorizedError("User role not found. Please contact admin.");
    }

    if (roleData.status !== "active") {
      throw new UnauthorizedError("Your role is not active. Please contact admin.");
    }

    roleName = roleData.name;

    const rolePermissions = (roleData.permissions || []).map((p: any) => ({
      module: p.module,
      actions: (p.actions || []).map((a: any) => ({
        id: a._id?.toString() || "",
        action: a.action || "",
      })),
    }));

    const userPermissions = (user.permissions || []).map((p: any) => ({
      module: p.module,
      actions: (p.actions || []).map((a: any) => ({
        id: a._id?.toString() || "",
        action: a.action || "",
      })),
    }));

    mappedPermissions = mergePermissions(rolePermissions, userPermissions);
  }

  const openShift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  });

  // ✅ Token خفيف - بدون permissions
  const token = generateToken({
    _id: user._id!,
    username: user.username,
    role: user.role,
    role_id: user.role_id || null,
    warehouse_id: user.warehouse_id || null,
  });

  // ✅ الـ permissions في الـ Response بس
  SuccessResponse(res, {
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      status: user.status,
      role: user.role,
      role_id: user.role_id || null,
      role_name: roleName || (user.role === "superadmin" ? "Super Admin" : null),
      warehouse_id: user.warehouse_id ? user.warehouse_id.toString() : null,
      permissions: mappedPermissions,
    },
    hasOpenShift: !!openShift,
  });
};

// ✅ Helper
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

export const signup = async (req: Request, res: Response) => {
  const data = req.body;

  // ✅ check if user already exists
  const existingUser = await UserModel.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new ConflictError("Email is already registered");
    }
    if (existingUser.phone === data.phone) {
      throw new ConflictError("Phone Number is already used");
    }
  }

  // ✅ hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // ✅ create new user
  const newUser = await UserModel.create({
    username: data.username,
    email: data.email,
    password_hash: hashedPassword,
    phone: data.phone,
    company_name: data.company_name,
    role: data.role, // default = admin لو مش مبعوتة
    possitionId: data.possitionId,
    address: data.address,
    vat_number: data.vat_number,
    state: data.state,
    postal_code: data.postal_code,
  });

  // ✅ save image if exists
  if (data.imageBase64) {
    const imageUrl = await saveBase64Image(
      data.imageBase64,
      String(newUser._id),
      req,
      "users"
    );
    newUser.image_url = imageUrl;
    await newUser.save();
  }


  SuccessResponse(
    res,
    {
      message: "User Signup Successfully. Please login.",
    },
    201
  );
};
