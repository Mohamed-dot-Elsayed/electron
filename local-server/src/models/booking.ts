import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const BookingSchema: SchemaDef = {
  number_of_days: {
    type: "number",
    required: true,
  },
  deposit: {
    type: "number",
    required: true,
  },
  CustmerId: {
    type: "string", // UUID reference to Customer
    ref: "Customer",
  },
  WarehouseId: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
  },
  ProductId: {
    type: "string", // UUID reference to Product
    ref: "Product",
  },
  CategoryId: {
    type: "string", // UUID reference to Category
    ref: "Category",
  },
  option_id: {
    type: "string", // UUID reference to ProductPriceOption
    ref: "ProductPriceOption",
  },
  status: {
    type: "string",
    enum: ["pending", "pay", "failer"],
    default: "pending",
  },
};

export const BookingModel = createModel("bookings", BookingSchema, {
  timestamps: true,
});