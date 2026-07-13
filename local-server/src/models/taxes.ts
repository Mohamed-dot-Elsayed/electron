import { createModel } from "../db/createModel";
import {SchemaDef} from '../db/types';

const TaxesSchema: SchemaDef = {
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
};

export const TaxesModel = createModel("Taxes", TaxesSchema, {
  timestamps: true,
});