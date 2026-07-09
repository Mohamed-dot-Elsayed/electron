import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const PaymobSchema: SchemaDef = {
  isActive: {
    type: "boolean",
    default: false,
  },
  sandboxMode: {
    type: "boolean",
    default: true,
  },
  api_key: {
    type: "string",
    required: true,
  },
  iframe_id: {
    type: "string",
    required: true,
  },
  integration_id: {
    type: "string",
    required: true,
  },
  hmac_key: {
    type: "string",
    required: true,
  },
  payment_method_id: {
    type: "string",
    ref: "PaymentMethod",
    required: true,
  },
};

export const PaymobModel = createModel("paymobs", PaymobSchema, {
  timestamps: true,
});