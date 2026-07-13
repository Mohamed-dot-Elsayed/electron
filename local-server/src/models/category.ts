import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CategorySchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  image: {
    type: "string",
  },
  parentId: {
    type: "string", // UUID reference to Category (self-referencing)
    ref: "Category",
    // Note: null/undefined = root category
  },
  product_quantity: {
    type: "number",
    default: 0,
  },
  Is_Online: {
    type: "boolean",
    default: true,
  },
};

export const CategoryModel = createModel("Category", CategorySchema, {
  timestamps: true,
});