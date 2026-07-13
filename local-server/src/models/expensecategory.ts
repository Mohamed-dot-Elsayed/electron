import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const ExpenseCategorySchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
    unique: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
};

export const ExpenseCategoryModel = createModel("ExpenseCategory", ExpenseCategorySchema, {
  timestamps: true,
});