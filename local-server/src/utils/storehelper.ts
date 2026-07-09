// src/utils/storeHelper.ts
import { UserModel } from "../models/user";
import { WarehouseModel } from "../models/warehouse";

export const getStoreInfo = async (userId: string) => {
  const superAdmin = await UserModel.findOne({ role: "superadmin" })
    .select("company_name phone address warehouse_id")
    .lean();

  if (superAdmin?.company_name) {
    return {
      name: superAdmin.company_name,
      phone: superAdmin.phone || "",
      address: superAdmin.address || "",
    };
  }

  if (superAdmin?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(superAdmin.warehouse_id)
      .select("name phone address")
      .lean();
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  const user = await UserModel.findById(userId)
    .select("company_name phone address warehouse_id")
    .lean();

  if (user?.company_name) {
    return {
      name: user.company_name,
      phone: user.phone || "",
      address: user.address || "",
    };
  }

  if (user?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(user.warehouse_id)
      .select("name phone address")
      .lean();
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  return { name: "", phone: "", address: "" };
};