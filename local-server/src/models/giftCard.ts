import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const GiftCardSchema: SchemaDef = {
  code: {
    type: "string",
    required: true,
    unique: true,
  },
  amount: {
    type: "number",
    required: true,
  },
  customer_id: {
    type: "string", // UUID reference to Customer
    ref: "Customer",
  },
  expiration_date: {
    type: "date",
  },
  isActive: {
    type: "boolean",
    default: true,
  },
};

export const GiftCardModel = createModel("gift_cards", GiftCardSchema, {
  timestamps: true,
});