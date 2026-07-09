import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const CountrySchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
  isDefault: {
    type: "boolean",
    default: false,
  },
};

export const CountryModel = createModel("countries", CountrySchema, {
  timestamps: true, // Note: original schema doesn't have timestamps, but adding for consistency
});