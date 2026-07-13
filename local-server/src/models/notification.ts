import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const NotificationSchema: SchemaDef = {
  type: {
    type: "string",
    enum: ["expiry", "expired", "low_stock"],
    required: true,
  },
  productId: {
    type: "string", // UUID reference to Product
    ref: "Product",
  },
  purchaseItemId: {
    type: "string", // UUID reference to PurchaseItem
    ref: "PurchaseItem",
  },
  message: {
    type: "string",
    required: true,
  },
  isRead: {
    type: "boolean",
    default: false,
  },
};

export const NotificationModel = createModel("Notification", NotificationSchema, {
  timestamps: true,
});