import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const ExpenseSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
  },
  amount: {
    type: "number",
    required: true,
  },
  Category_id: {
    type: "string", // UUID reference to ExpenseCategory
    ref: "ExpenseCategory",
    required: true,
  },
  shift_id: {
    type: "string", // UUID reference to CashierShift
    ref: "CashierShift",
  },
  cashier_id: {
    type: "string", // UUID reference to User (cashier)
    ref: "User",
  },
  admin_id: {
    type: "string", // UUID reference to User (admin)
    ref: "User",
  },
  note: {
    type: "string",
  },
  financial_accountId: {
    type: "string", // UUID reference to BankAccount
    ref: "BankAccount",
    required: true,
  },
};

export const ExpenseModel = createModel("expenses", ExpenseSchema, {
  timestamps: true,
});