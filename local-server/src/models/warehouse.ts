import { createModel } from "../db/createModel";
import { SchemaDef } from "../db/types";

const WarehouseSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    // Note: maxlength not supported, validate in application logic
  },
  address: {
    type: "string",
    required: true,
  },
  phone: {
    type: "string",
    // Note: maxlength not supported, validate in application logic
  },
  email: {
    type: "string",
    // Note: maxlength not supported, validate in application logic
  },
  number_of_products: {
    type: "number",
    default: 0,
  },
  stock_Quantity: {
    type: "number",
    default: 0,
  },
  Is_Online: {
    type: "boolean",
    default: false,
  },
};

export const WarehouseModel = createModel("warehouses", WarehouseSchema, {
  timestamps: true,
});
