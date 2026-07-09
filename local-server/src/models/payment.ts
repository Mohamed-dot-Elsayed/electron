import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const PaymentSchema: SchemaDef = {
  sale_id: {
    type: "string", // UUID reference to Sale
    ref: "Sale",
    required: true,
  },
  financials: {
    type: "array",
    items: {
      type: "object",
      schema: {
        account_id: {
          type: "string", // UUID reference to BankAccount
          ref: "BankAccount",
          required: true,
        },
        amount: {
          type: "number",
          required: true,
        },
      },
    },
    default: [],
  },
  status: {
    type: "string",
    enum: ["pending", "completed"],
    default: "completed",
  },
  payment_proof: {
    type: "string",
  },
};

export const PaymentModel = createModel("payments", PaymentSchema, {
  timestamps: true,
});