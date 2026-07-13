import { createModel } from "../db/createModel";
import {SchemaDef} from "../db/types"

const PositionSchema: SchemaDef = {
  name: {
    type: "string",
    required: true,
    unique: true,
  },
};

export const PositionModel = createModel("Position", PositionSchema, {
  timestamps: true,
});