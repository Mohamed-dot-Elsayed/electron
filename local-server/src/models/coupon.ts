import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CouponSchema: SchemaDef = {
  coupon_code: {
    type: "string",
    required: true,
    unique: true,
    // Note: trim and maxlength not supported - handle in application logic
  },
  type: {
    type: "string",
    enum: ["percentage", "flat"],
    required: true,
  },
  amount: {
    type: "number",
    required: true,
  },
  minimum_amount_for_use: {
    type: "number",
    default: 0,
  },
  quantity: {
    type: "number",
    required: true,
  },
  available: {
    type: "number",
    required: true,
  },
  expired_date: {
    type: "date",
    required: true,
  },
};

export const CouponModel = createModel("Coupon", CouponSchema, {
  timestamps: true,
});