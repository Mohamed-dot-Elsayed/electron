import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CurrencySchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  amount: {
    type: "number",
  },
  isdefault: {
    type: "boolean",
    default: false,
  },
};

export const CurrencyModel = createModel("Currency", CurrencySchema, {
  timestamps: true,
});