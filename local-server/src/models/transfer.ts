import { createModel } from "../db/createModel";
import { SchemaDef } from "../db/types";

const TransferProductSchema: SchemaDef = {
  productId: { type: "string", required: true, ref: "Product" },
  productPriceId: { type: "string", default: null, ref: "ProductPrice" },
  quantity: { type: "number", required: true, default: 1 },
};

const TransferSchema: SchemaDef = {
  reference: { type: "string", default: "" },
  date: { type: "string", default: "" },
  fromWarehouseId: { type: "string", required: true, ref: "Warehouse" },
  toWarehouseId: { type: "string", required: true, ref: "Warehouse" },
  products: { type: "array", items: { type: "object", schema: TransferProductSchema }, default: [] },
  rejected_products: { type: "array", items: { type: "object", schema: TransferProductSchema }, default: [] },
  approved_products: { type: "array", items: { type: "object", schema: TransferProductSchema }, default: [] },
  status: { type: "string", enum: ["pending", "received", "rejected"], default: "pending" },
  reason: { type: "string", default: "" },
};

export const TransferModel = createModel("Transfer", TransferSchema, { timestamps: true });