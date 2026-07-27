import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"
import { ORDER_TYPES } from '../types/constant';

const OrderSchema: SchemaDef = {
  user: {
    type: "string", // UUID reference to Customer
    ref: "Customer",
    // Note: sparse index not supported
  },
  orderType: {
    type: "string",
    enum: ORDER_TYPES as unknown as string[],
    required: true,
    default: "delivery",
  },
  warehouse: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
  },
  cartItems: {
    type: "array",
    items: {
      type: "object",
      schema: {
        product: {
          type: "string", // UUID reference to Product
          ref: "Product",
        },
        quantity: {
          type: "number",
        },
        price: {
          type: "number",
        },
        variant: {
          type: "string", // UUID reference to ProductPrice
          ref: "ProductPrice",
        },
      },
    },
    default: [],
  },
  shippingAddress: {
    type: "object",
    schema: {
      details: {
        type: "string",
      },
      city: {
        type: "string",
      },
      zone: {
        type: "string",
      },
    },
    default: {},
  },
  shippingPrice: {
    type: "number",
    required: true,
    default: 0,
  },
  totalOrderPrice: {
    type: "number",
    required: true,
  },
  coupon: {
    type: "string", // UUID reference to Coupon
    ref: "Coupon",
  },
  couponDiscount: {
    type: "number",
    default: 0,
  },
  serviceFee: {
    type: "number",
    default: 0,
  },
  taxAmount: {
    type: "number",
    default: 0,
  },
  totalPriceAfterDiscount: {
    type: "number",
    default: 0,
  },
  paymentMethod: {
    type: "string", // UUID reference to PaymentMethod
    ref: "PaymentMethod",
    required: true,
  },
  paymentGateway: {
    type: "string",
    enum: ["manual", "paymob", "geidea", "fawry"],
    default: "manual",
  },
  paymentStatus: {
    type: "string",
    enum: ["unpaid", "pending", "paid", "failed"],
    default: "unpaid",
  },
  paymobOrderId: {
    type: "string",
  },
  paymobTransactionId: {
    type: "string",
  },
  paymobIframeUrl: {
    type: "string",
  },
  paymobCallbackPayload: {
    type: "object",
    schema: {}, // Empty schema for Mixed type - allows any object structure
    default: {},
  },
  geideaSessionId: {
    type: "string",
  },
  geideaTransactionId: {
    type: "string",
  },
  geideaCallbackPayload: {
    type: "object",
    schema: {}, // Empty schema for Mixed type - allows any object structure
    default: {},
  },
  proofImage: {
    type: "string",
  },
  status: {
    type: "string",
    enum: ["pending","confirmed","processing","out_for_delivery","delivered","returned","failed_to_deliver","canceled","scheduled","refund"],
    default: "pending",
  },
};

export const OrderModel = createModel("Orders", OrderSchema, {
  timestamps: true,
});