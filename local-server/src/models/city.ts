import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CitySchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  country: {
    type: "string", // UUID reference to Country
    ref: "Country",
    required: true,
  },
  shipingCost: {
    type: "number",
    default: 0,
  },
};

export const CityModel = createModel("cities", CitySchema, {
  timestamps: true, // Note: original schema doesn't have timestamps
});