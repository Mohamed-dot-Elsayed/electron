import { createModel } from "../db/createModel";
import {SchemaDef} from '../db/types';

const ServiceFeeSchema: SchemaDef = {
  title: {
    type: "string",
    required: true,
    // Note: trim not supported - handle in application logic
  },
  amount: {
    type: "number",
    required: true,
    // Note: min not supported - validate in application logic
  },
  type: {
    type: "string",
    enum: ["fixed", "percentage"],
    required: true,
  },
  module: {
    type: "string",
    enum: ["online", "pos"],
    required: true,
  },
  warehouseId: {
    type: "string", // UUID reference to Warehouse
    ref: "Warehouse",
    default: null, // null = applies to all warehouses
  },
  status: {
    type: "boolean",
    default: true,
  },
};

export const ServiceFeeModel = createModel("service_fees", ServiceFeeSchema, {
  timestamps: true,
});