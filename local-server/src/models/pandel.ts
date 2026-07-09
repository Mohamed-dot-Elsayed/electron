import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

// Pandel Product sub-schema
const PandelProductSchema: SchemaDef = {
  productId: {
    type: "string", // UUID reference to Product
    ref: "Product",
    required: true,
  },
  productPriceId: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
    default: null, // null = cashier chooses, ID = admin specified
  },
  quantity: {
    type: "number",
    default: 1,
  },
};

// Main Pandel (Bundle) schema
const PandelSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  startdate: {
    type: "date",
    required: true,
  },
  enddate: {
    type: "date",
    required: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
  all_warehouses: {
    type: "boolean",
    default: true,
  },
  warehouse_ids: {
    type: "array",
    items: {
      type: "string", // Array of Warehouse UUIDs
      ref: "Warehouse",
    },
    default: [],
  },
  images: {
    type: "array",
    items: {
      type: "string", // Array of image URL strings
    },
    default: [],
  },
  products: {
    type: "array",
    items: {
      type: "object",
      schema: PandelProductSchema,
    },
    default: [],
  },
  price: {
    type: "number",
    required: true,
  },
};

export const PandelModel = createModel("pandels", PandelSchema, {
  timestamps: true,
});