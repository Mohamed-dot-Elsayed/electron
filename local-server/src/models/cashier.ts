import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CashierSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  warehouse_id: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
    required: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
  cashier_active: {
    type: "boolean",
    default: false,
  },
  bankAccounts: {
    type: "array",
    items: {
      type: "string", // Array of BankAccount UUIDs
      ref: "BankAccount",
    },
    default: [],
  },
  printer_type: {
    type: "string",
    enum: ["USB", "NETWORK"],
  },
  printer_IP: {
    type: "string",
    // Note: conditional required and IP regex validation not supported
    // Must be handled in application logic
  },
  printer_port: {
    type: "number",
    // Note: conditional required not supported
    // Must be handled in application logic
  },
  Printer_name: {
    type: "string",
    // Note: conditional required not supported
    // Must be handled in application logic
  },
};

export const CashierModel = createModel("Cashier", CashierSchema, {
  timestamps: true,
});