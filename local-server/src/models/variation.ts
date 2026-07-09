import { createModel } from "../db/createModel";
import {SchemaDef} from '../db/types';

const VariationSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
  ar_name: {
    type: "string",
    required: true,
  },
};

const OptionSchema: SchemaDef = {
  variationId: {
    type: "string",
    ref: "Variation",
    required: true,
  },
  name: {
    type: "string",
    required: true,
  },
  status: {
    type: "boolean",
    default: true,
  },
};

export const VariationModel = createModel("variations", VariationSchema, {
  timestamps: true,
});

export const OptionModel = createModel("options", OptionSchema, {
  timestamps: true,
});