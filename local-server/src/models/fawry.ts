import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const FawrySchema: SchemaDef = {
  payment_method_id: {
    type: "string",
    ref: "PaymentMethod",
    required: true,
  },
  merchantCode: {
    type: "string",
    required: true,
  },
  secureKey: {
    type: "string",
    required: true,
  },
  isActive: {
    type: "boolean",
    default: false,
  },
  sandboxMode: {
    type: "boolean",
    default: true,
  },
};

export const FawryModel = createModel("Fawry", FawrySchema, {
  timestamps: true,
});