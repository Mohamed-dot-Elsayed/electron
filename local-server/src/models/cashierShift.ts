import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CashierShiftSchema: SchemaDef = {
  start_time: {
    type: "date",
  },
  end_time: {
    type: "date",
  },
  status: {
    type: "string",
    enum: ["open", "closed"],
    default: "open",
  },
  total_sale_amount: {
    type: "number",
    default: 0,
  },
  total_expenses: {
    type: "number",
    default: 0,
  },
  net_cash_in_drawer: {
    type: "number",
    default: 0,
  },
  cashierman_id: {
    type: "string", // UUID reference to User
    ref: "User",
    required: true,
  },
  cashier_id: {
    type: "string", // UUID reference to Cashier
    ref: "Cashier",
    required: true,
  },
};

export const CashierShift = createModel("cashier_shifts", CashierShiftSchema, {
  timestamps: true,
});