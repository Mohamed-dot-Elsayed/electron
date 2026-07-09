import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const BrandSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
  },
  logo: {
    type: "string",
  },
};

export const BrandModel = createModel("brands", BrandSchema, {
  timestamps: true,
});