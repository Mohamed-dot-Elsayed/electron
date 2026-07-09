import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

// ==================== Sale Schema ====================
const SaleSchema: SchemaDef = {
  reference: {
    type: "string",
    unique: true,
    default: function () {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const datePart = `${month}${day}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${datePart}${randomPart}`;
    },
    // Note: trim and maxlength not supported - handle in application logic
  },
  customer_id: {
    type: "string", // UUID reference to Customer
    ref: "Customer",
  },
  Due_customer_id: {
    type: "string", // UUID reference to Customer (debt customer)
    ref: "Customer",
  },
  Due: {
    type: "number", // Using number instead of boolean since original uses 0/1
    enum: [0, 1],
    default: 0,
  },
  remaining_amount: {
    type: "number",
    default: 0,
  },
  warehouse_id: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
    required: true,
  },
  account_id: {
    type: "array",
    items: {
      type: "string", // Array of BankAccount UUIDs
      ref: "BankAccount",
    },
    default: [],
  },
  order_pending: {
    type: "number", // Using number instead of boolean since original uses 0/1
    enum: [0, 1],
    default: 1,
  },
  order_tax: {
    type: "string", // UUID reference to Taxes
    ref: "Taxes",
  },
  order_discount: {
    type: "string", // UUID reference to Discount
    ref: "Discount",
  },
  service_fees: {
    type: "array",
    items: {
      type: "object",
      schema: {
        service_fee_id: {
          type: "string",
          ref: "ServiceFee",
        },
        title: {
          type: "string",
          required: true,
        },
        type: {
          type: "string",
          enum: ["fixed", "percentage"],
          required: true,
        },
        rate: {
          type: "number",
          required: true,
          // Note: min not supported
        },
        amount: {
          type: "number",
          required: true,
          // Note: min not supported
        },
        module: {
          type: "string",
          enum: ["online", "pos"],
          required: true,
        },
        warehouseId: {
          type: "string",
          ref: "Warehouse",
        },
      },
    },
    default: [],
  },
  service_fee_total: {
    type: "number",
    default: 0,
  },
  grand_total: {
    type: "number",
    required: true,
  },
  gift_card_id: {
    type: "string", // UUID reference to GiftCard
    ref: "GiftCard",
  },
  coupon_code: {
    type: "string",
    default: "",
  },
  applied_coupon: {
    type: "boolean",
    default: false,
  },
  cashier_id: {
    type: "string", // UUID reference to User
    ref: "User",
    required: true,
  },
  shift_id: {
    type: "string", // UUID reference to CashierShift
    ref: "CashierShift",
    required: true,
  },
  shipping: {
    type: "number",
    default: 0,
  },
  tax_rate: {
    type: "number",
    default: 0,
  },
  tax_amount: {
    type: "number",
    default: 0,
  },
  discount: {
    type: "number",
    default: 0,
  },
  total: {
    type: "number",
    default: 0,
  },
  paid_amount: {
    type: "number",
    default: 0,
  },
  note: {
    type: "string",
    default: "",
  },
  date: {
    type: "date",
    default: () => new Date(),
  },
};

export const SaleModel = createModel("sales", SaleSchema, {
  timestamps: true,
});

// ==================== Product Sales Schema ====================
const ProductSalesSchema: SchemaDef = {
  sale_id: {
    type: "string", // UUID reference to Sale
    ref: "Sale",
    required: true,
  },
  product_id: {
    type: "string", // UUID reference to Product
    ref: "Product",
  },
  bundle_id: {
    type: "string", // UUID reference to Pandel (Bundle)
    ref: "Pandel",
  },
  quantity: {
    type: "number",
    required: true,
    // Note: min not supported
  },
  price: {
    type: "number",
    required: true,
    // Note: min not supported
  },
  subtotal: {
    type: "number",
    required: true,
    // Note: min not supported
  },
  discount: {
    type: "number",
    default: 0,
  },
  discount_type: {
    type: "string",
    enum: ["fixed", "percentage"],
    default: "fixed",
  },
  original_price: {
    type: "number",
    default: 0,
  },
  product_price_id: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
  },
  isGift: {
    type: "boolean",
    default: false,
  },
  isBundle: {
    type: "boolean",
    default: false,
  },
  options_id: {
    type: "array",
    items: {
      type: "string", // Array of Option UUIDs
      ref: "Option",
    },
    default: [],
  },
};

export const ProductSalesModel = createModel("product_sales", ProductSalesSchema, {
  timestamps: true,
});