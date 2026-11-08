import { createModel } from "../db/createModel";
import { SchemaDef } from "../db/types";

const InstallmentItemSchema: SchemaDef = {
  plan_id: { type: "string", required: true, ref: "InstallmentPlan" },
  customer_id: { type: "string", default: null },
  due_date: { type: "string", default: "" },
  amount: { type: "number", default: 0 },
  paid_amount: { type: "number", default: 0 },
  status: { type: "string", enum: ["pending", "paid", "overdue", "cancelled"], default: "pending" },
  payment_date: { type: "string", default: null },
  note: { type: "string", default: "" },
};

export const InstallmentItemModel = createModel("InstallmentItem", InstallmentItemSchema, { timestamps: true });