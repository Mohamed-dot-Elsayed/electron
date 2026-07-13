import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

// ==================== Product Price Schema ====================
const ProductPriceSchema: SchemaDef = {
  productId: {
    type: "string", // UUID reference to Product
    ref: "Product",
    required: true,
  },
  price: {
    type: "number",
    required: true,
  },
  code: {
    type: "string",
    unique: true,
    // Note: sparse not supported - same consideration as previous models
  },
  gallery: {
    type: "array",
    items: {
      type: "string", // Array of image URL strings
    },
    default: [],
  },
  quantity: {
    type: "number",
    default: 0,
  },
  strat_quantaty: {
    type: "number",
    default: 0,
  },
  cost: {
    type: "number",
    default: 0,
  },
};

export const ProductPriceModel = createModel("ProductPrice", ProductPriceSchema, {
  timestamps: true,
});

// ==================== Product Price Option Schema ====================
const ProductPriceOptionSchema: SchemaDef = {
  product_price_id: {
    type: "string", // UUID reference to ProductPrice
    ref: "ProductPrice",
    required: true,
  },
  option_id: {
    type: "string", // UUID reference to Option
    ref: "Option",
    required: true,
  },
};

export const ProductPriceOptionModel = createModel("ProductPriceOption", ProductPriceOptionSchema, {
  timestamps: true,
});