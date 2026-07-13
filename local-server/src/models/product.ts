import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const ProductSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  ar_description: {
    type: "string",
    required: true,
  },
  image: {
    type: "string",
  },
  categoryId: {
    type: "array",
    items: {
      type: "string", // Array of Category UUIDs
      ref: "Category",
    },
    default: [],
  },
  brandId: {
    type: "string", // UUID reference to Brand
    ref: "Brand",
  },
  product_unit: {
    type: "string", // UUID reference to Unit
    ref: "Unit",
  },
  sale_unit: {
    type: "string", // UUID reference to Unit
    ref: "Unit",
  },
  purchase_unit: {
    type: "string", // UUID reference to Unit
    ref: "Unit",
  },
  code: {
    type: "string",
    unique: true,
    // Note: sparse not supported - may need to handle null duplicates
  },
  price: {
    type: "number",
  },
  free_shipping: {
    type: "boolean",
    default: false,
  },
  quantity: {
    type: "number",
  },
  description: {
    type: "string",
  },
  exp_ability: {
    type: "boolean",
    default: false,
  },
  // date_of_expiery: { type: "date" }, // Commented out in original
  minimum_quantity_sale: {
    type: "number",
    default: 1,
  },
  low_stock: {
    type: "number",
  },
  whole_price: {
    type: "number",
  },
  start_quantaty: {
    type: "number",
  },
  cost: {
    type: "number",
  },
  taxesId: {
    type: "string", // UUID reference to Taxes
    ref: "Taxes",
  },
  product_has_imei: {
    type: "boolean",
    default: false,
  },
  different_price: {
    type: "boolean",
    default: false,
  },
  show_quantity: {
    type: "boolean",
    default: true,
  },
  maximum_to_show: {
    type: "number",
  },
  gallery_product: {
    type: "array",
    items: {
      type: "string", // Array of image URL strings
    },
    default: [],
  },
  is_featured: {
    type: "boolean",
    default: false,
  },
  Is_Online: {
    type: "boolean",
    default: true,
  },
};

export const ProductModel = createModel("Product", ProductSchema, {
  timestamps: true,
});