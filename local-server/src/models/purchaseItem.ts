import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const PurchaseItemSchema: SchemaDef = {
  date: {
    type: "date",
    required: true,
    default: () => new Date(),
  },
  product_id: {
    type: "string", // UUID reference to Product
    ref: "Product",
  },
  product_price_id: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
  },
  material_id: {
    type: "string", // UUID reference to Material
    ref: "Material",
  },
  category_id: {
    type: "string", // UUID reference to Category
    ref: "Category",
  },
  date_of_expiery: {
    type: "date",
  },
  purchase_id: {
    type: "string", // UUID reference to Purchase
    ref: "Purchase",
  },
  patch_number: {
    type: "string",
  },
  warehouse_id: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
  },
  quantity: {
    type: "number",
    required: true,
  },
  unit_cost: {
    type: "number",
    required: true,
  },
  subtotal: {
    type: "number",
    required: true,
  },
  discount_share: {
    type: "number",
    default: 0,
  },
  unit_cost_after_discount: {
    type: "number",
    default: 0,
  },
  tax: {
    type: "number",
    default: 0,
  },
  item_type: {
    type: "string",
    enum: ["product", "material"],
    default: "product",
  },
};

export const PurchaseItemModel = createModel("purchase_items", PurchaseItemSchema, {
  timestamps: true,
});