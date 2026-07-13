import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const GeideaSchema: SchemaDef = {
  payment_method_id: {
    type: "string",
    ref: "PaymentMethod",
    required: true,
  },
  publicKey: {
    type: "string",
    required: true,
  },
  apiPassword: {
    type: "string",
    required: true,
  },
  merchantId: {
    type: "string",
    required: true,
  },
  webhookSecret: {
    type: "string",
    required: true,
  },
  isActive: {
    type: "boolean",
    default: true,
  },
};

export const GeideaModel = createModel("Geidea", GeideaSchema, {
  timestamps: true,
});