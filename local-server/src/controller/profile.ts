import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user";
import { BadRequest, NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { saveBase64Image } from "../utils/handleImages";
import { WarehouseModel } from "../models/warehouse";
import { RoleModel } from "../models/roles";

export const getMyProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest("User ID not found in request");
  }

  const userRaw = UserModel.findById(userId);

  if (!userRaw) {
    throw new NotFound("Profile not found");
  }

  // ✅ manual "-password_hash -__v" projection
  const { password_hash, __v, ...userSafe } = userRaw as any;

  // ✅ manual populate
  const warehousePop = userSafe.warehouse_id
    ? WarehouseModel.findById(userSafe.warehouse_id)
    : null;

  const rolePop = userSafe.role_id
    ? RoleModel.findById(userSafe.role_id)
    : null;

  const user = {
    ...userSafe,
    warehouse_id: warehousePop
      ? { _id: warehousePop._id, name: warehousePop.name }
      : null,
    role_id: rolePop
      ? {
          _id: rolePop._id,
          name: rolePop.name,
          status: rolePop.status,
          permissions: rolePop.permissions,
        }
      : null,
  };

  SuccessResponse(res, {
    message: "Profile retrieved successfully",
    profile: formatUserResponseDetailed(user),
  });
};

export const updateMyProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest("User ID not found in request");
  }

  const { username, email, password, company_name, phone, image_base64 } =
    req.body;

  const user = UserModel.findById(userId);
  if (!user) {
    throw new NotFound("Profile not found");
  }

  const patch: Record<string, any> = {};

  // Check unique username
  if (username && username !== user.username) {
    const existing = UserModel.find({ username }).find(
      (u: any) => u._id !== userId
    );
    if (existing) throw new BadRequest("Username already exists");
    patch.username = username;
  }

  // Check unique email
  if (email && email !== user.email) {
    const existing = UserModel.find({ email }).find(
      (u: any) => u._id !== userId
    );
    if (existing) throw new BadRequest("Email already exists");
    patch.email = email;
  }

  // Update fields
  if (company_name !== undefined) patch.company_name = company_name;
  if (phone !== undefined) patch.phone = phone;

  // Handle password
  if (password) {
    patch.password_hash = await bcrypt.hash(password, 10);
  }

  // Handle image
  if (image_base64) {
    patch.image_url = await saveBase64Image(
      image_base64,
      user.username,
      req,
      "users"
    );
  }

  const updatedRaw = UserModel.updateById(userId, patch);

  if (!updatedRaw) {
    throw new NotFound("Profile not found");
  }

  // ✅ manual populate for the response
  const warehousePop = updatedRaw.warehouse_id
    ? WarehouseModel.findById(updatedRaw.warehouse_id)
    : null;

  const rolePop = updatedRaw.role_id
    ? RoleModel.findById(updatedRaw.role_id)
    : null;

  const updatedUser = {
    ...updatedRaw,
    warehouse_id: warehousePop
      ? { _id: warehousePop._id, name: warehousePop.name }
      : null,
    role_id: rolePop ? { _id: rolePop._id, name: rolePop.name } : null,
  };

  SuccessResponse(res, {
    message: "Profile updated successfully",
    profile: formatUserResponseDetailed(updatedUser),
  });
};

export function formatUserResponseDetailed(user: any) {
  const base = formatUserResponse(user);

  // لو superadmin
  if (user.role === "superadmin") {
    return {
      ...base,
      isSuperAdmin: true,
      hasAllPermissions: true,
    };
  }

  // تجهيز الرول بشكل آمن
  let formattedRole = null;

  if (user.role_id && typeof user.role_id === "object") {
    formattedRole = {
      id: user.role_id._id?.toString(),
      name: user.role_id.name,
      status: user.role_id.status,
      permissions: user.role_id.permissions
        ? user.role_id.permissions.map((perm: any) => ({
            module: perm.module,
            actions: perm.actions
              ? perm.actions.map((act: any) => ({
                  id: act._id?.toString(),
                  action: act.action,
                }))
              : [],
          }))
        : [],
    };
  } else {
    // لو الرول مش معمولها populate (عبارة عن ID فقط)
    formattedRole = user.role_id?.toString() || null;
  }

  // بنمسح الـ role_id القديم عشان نرجع الشكل الأنضف
  if (base.role_id) delete base.role_id;

  return {
    ...base,
    // سميناها role_data عشان ما تعملش Override لحقل base.role اللي جواه كلمة "admin"
    role_data: formattedRole,
    isSuperAdmin: false,
  };
}

export const formatUserResponse = (user: any) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
    company_name: user.company_name || null,
    image_url: user.image_url || null,
    status: user.status,
    role: user.role, // "superadmin" or "admin"
    role_id: user.role_id?._id || user.role_id || null,
    role_name:
      user.role_id?.name || (user.role === "superadmin" ? "Super Admin" : null),
    warehouse_id: user.warehouse_id?._id || user.warehouse_id || null,
    warehouse_name: user.warehouse_id?.name || null,
    permissions: (user.permissions || []).map((p: any) => ({
      module: p.module,
      actions: (p.actions || []).map((a: any) => ({
        id: a._id?.toString() || "",
        action: a.action || "",
      })),
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
