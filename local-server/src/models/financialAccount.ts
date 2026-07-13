import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const BankAccountSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
  },
  warehouseId: {
    type: "array",
    items: {
      type: "string", // Array of Warehouse UUIDs
      ref: "Warehouse",
    },
    default: [],
  },
  image: {
    type: "string",
  },
  balance: {
    type: "number",
    default: 0,
  },
  description: {
    type: "string",
  },
  status: {
    type: "boolean",
    default: true,
  },
  in_POS: {
    type: "boolean",
    default: false,
  },
};

export const BankAccountModel = createModel("BankAccount", BankAccountSchema, {
  timestamps: true,
});