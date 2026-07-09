import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

// Return Item sub-schema
const ReturnItemSchema: SchemaDef = {
  product_id: {
    type: "string", // UUID reference to Product
    ref: "Product",
  },
  product_price_id: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
  },
  bundle_id: {
    type: "string", // UUID reference to Pandel (Bundle)
    ref: "Pandel",
  },
  original_quantity: {
    type: "number",
    required: true,
  },
  returned_quantity: {
    type: "number",
    required: true,
    // Note: min not supported - validate in application logic
  },
  price: {
    type: "number",
    required: true,
  },
  subtotal: {
    type: "number",
    required: true,
  },
};

// Main Return schema
const ReturnSchema: SchemaDef = {
  reference: {
    type: "string",
    unique: true,
    default: function () {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const datePart = `${month}${day}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${datePart}${randomPart}`;
    },
    // Note: trim and maxlength not supported - handle in application logic
  },
  sale_id: {
    type: "string", // UUID reference to Sale
    ref: "Sale",
    required: true,
  },
  sale_reference: {
    type: "string",
    required: true,
  },
  customer_id: {
    type: "string", // UUID reference to Customer
    ref: "Customer",
  },
  warehouse_id: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
    required: true,
  },
  cashier_id: {
    type: "string", // UUID reference to User
    ref: "User",
    required: true,
  },
  shift_id: {
    type: "string", // UUID reference to CashierShift
    ref: "CashierShift",
    required: true,
  },
  items: {
    type: "array",
    items: {
      type: "object",
      schema: ReturnItemSchema,
    },
    default: [],
  },
  total_amount: {
    type: "number",
    required: true,
  },
  refund_method: {
    type: "string",
    enum: ["cash", "card", "store_credit", "original_method"],
    default: "original_method",
  },
  refund_account_id: {
    type: "string", // UUID reference to BankAccount
    ref: "BankAccount",
  },
  image: {
    type: "string",
    default: "",
  },
  note: {
    type: "string",
    default: "",
  },
  date: {
    type: "date",
    default: () => new Date(),
  },
};

export const ReturnModel = createModel("returns", ReturnSchema, {
  timestamps: true,
});