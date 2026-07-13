import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const DiscountSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  amount: {
    type: "number",
    required: true,
    // Note: min not supported - validate in application logic
  },
  type: {
    type: "string",
    enum: ["percentage", "fixed"],
    required: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
};

export const DiscountModel = createModel("Discount", DiscountSchema, {
  timestamps: true,
});