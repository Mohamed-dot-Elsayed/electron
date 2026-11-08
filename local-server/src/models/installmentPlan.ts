import { createModel } from "../db/createModel";
import { SchemaDef } from "../db/types";

const InstallmentPlanSchema: SchemaDef = {
  plan_number: { type: "string", default: "" },
  order_reference: { type: "string", default: "" },
  customer_id: { type: "string", default: null },
  warehouse_id: { type: "string", default: null },
  status: { type: "string", enum: ["active", "completed", "cancelled"], default: "active" },
  total_payable: { type: "number", default: 0 },
  paid_amount: { type: "number", default: 0 },
  remaining_amount: { type: "number", default: 0 },
  down_payment: { type: "number", default: 0 },
  order_total: { type: "number", default: 0 },
  interest_type: { type: "string", default: "percentage" },
  interest_value: { type: "number", default: 0 },
  max_installments: { type: "number", default: 12 },
};

export const InstallmentPlanModel = createModel("InstallmentPlan", InstallmentPlanSchema, { timestamps: true });