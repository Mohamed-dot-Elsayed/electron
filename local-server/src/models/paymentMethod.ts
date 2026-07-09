import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const PaymentMethodSchema: SchemaDef = {
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
  isActive: {
    type: "boolean",
    default: true,
  },
  discription: {
    type: "string",
    required: true,
  },
  icon: {
    type: "string",
    required: true,
  },
  type: {
    type: "string",
    required: true,
    enum: ["manual", "automatic"],
  },
};

export const PaymentMethodModel = createModel("payment_methods", PaymentMethodSchema, {
  timestamps: true,
});