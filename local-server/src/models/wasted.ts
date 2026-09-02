import { createModel } from "../db/createModel";
import { SchemaDef } from "../db/types";

const wastedSchema: SchemaDef = {
  productId: {
    type: "string",
    ref: "Product",
    required: true,
  },
  productPriceId: {
    type: "string",
    ref: "ProductPrice",
    default: null,
  },
  warehouseId: {
    type: "string",
    ref: "Warehouse",
    required: true,
  },
  quantity: {
    type: "number",
    required: true,
  },
  reason: {
    type: "string",
    required: true,
    enum: ["theft", "lost", "stocktake_not_found", "damaged", "expired", "other"],
  },
  note: {
    type: "string",
  },
  userId: {
    type: "string",
    ref: "User",
    required: true,
  },
  isApproved: {
    type: "boolean",
    default: false,
  },
};

export const WastedModel = createModel("Wasted", wastedSchema, {
  timestamps: true,
});

export const wastedModel = WastedModel;

