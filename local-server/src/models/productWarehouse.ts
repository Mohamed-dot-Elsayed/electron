import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const Product_WarehouseSchema: SchemaDef = {
  productId: {
    type: "string", // UUID reference to Product
    ref: "Product",
    required: true,
  },
  productPriceId: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
    default: null, // null = base product, ID = specific variant
  },
  warehouseId: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
    required: true,
  },
  quantity: {
    type: "number",
    required: true,
    default: 0,
  },
  low_stock: {
    type: "number",
    default: 0,
  },
};

export const Product_WarehouseModel = createModel("Product_Warehouse", Product_WarehouseSchema, {
  timestamps: true,
});