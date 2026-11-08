import { Request, Response } from "express";
import { InstallmentPlanModel } from "../models/installmentPlan";
import { InstallmentItemModel } from "../models/installmentItem";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";

const roundMoney = (n: number) => Math.round((n || 0) * 100) / 100;

export const getPosInstallmentSettings = async (req: Request, res: Response) => {
  SuccessResponse(res, {
    message: "Installment settings fetched successfully",
    settings: {
      enabled: true,
      interest_type: "percentage",
      interest_value: 0,
      max_installments: 12,
      min_down_payment_percent: 0,
    },
  });
};

export const previewPosInstallment = async (req: Request, res: Response) => {
  const { total, months, down_payment = 0 } = req.body;
  const t = Number(total || 0);
  const m = Math.max(1, Number(months || 1));
  const down = Number(down_payment || 0);
  const remaining = Math.max(0, t - down);
  const per = roundMoney(remaining / m);
  const schedule = Array.from({ length: m }, (_, i) => ({
    installment_number: i + 1,
    amount: per,
    due_date: null,
  }));
  SuccessResponse(res, {
    message: "Installment plan preview",
    plan: { total: t, down_payment: down, months: m, installments: schedule },
  });
};

export const listPosDueInstallments = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const { status, days = 0, customer_id, search } = req.query as any;

  const planFilter: any = {};
  if (warehouseId) planFilter.warehouse_id = warehouseId;
  planFilter.status = { $in: ["active", "completed"] };
  if (customer_id) planFilter.customer_id = String(customer_id).trim();

  const plans = InstallmentPlanModel.find(planFilter);
  const planMap = new Map(plans.map((p: any) => [String(p._id), p]));

  const itemFilter: any = { plan_id: { $in: plans.map((p: any) => p._id) } };
  if (status === "paid") itemFilter.status = "paid";
  else if (status === "overdue") itemFilter.status = "overdue";
  else itemFilter.status = { $in: ["pending", "overdue"] };

  let items = InstallmentItemModel.find(itemFilter).sort((a: any, b: any) =>
    String(a.due_date || "").localeCompare(String(b.due_date || ""))
  );

  let rows = items.map((item: any) => {
    const plan = planMap.get(String(item.plan_id)) || null;
    const amount = roundMoney(Number(item.amount || 0));
    const paid = roundMoney(Number(item.paid_amount || 0));
    return {
      ...item,
      amount,
      paid_amount: paid,
      remaining_amount: roundMoney(Math.max(0, amount - paid)),
      plan,
    };
  });

  if (search) {
    const keyword = String(search).toLowerCase().trim();
    rows = rows.filter((row: any) => {
      const name = String(row.customer_id?.name || "").toLowerCase();
      const phone = String(row.customer_id?.phone_number || "").toLowerCase();
      return (
        name.includes(keyword) ||
        phone.includes(keyword) ||
        String(row.plan?.plan_number || "").toLowerCase().includes(keyword)
      );
    });
  }

  const totalRemaining = roundMoney(rows.reduce((s: number, r: any) => s + r.remaining_amount, 0));

  SuccessResponse(res, {
    message: "Due installments fetched successfully",
    count: rows.length,
    total_remaining: totalRemaining,
    installments: rows,
  });
};

export const listPosInstallmentPlans = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const filter: any = {};
  if (warehouseId) filter.warehouse_id = warehouseId;
  const plans = InstallmentPlanModel.find(filter).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  SuccessResponse(res, { message: "Installment plans", count: plans.length, plans });
};

export const getPosInstallmentPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const plan = InstallmentPlanModel.findById(id);
  if (!plan) throw new NotFound("Installment plan not found");
  const items = InstallmentItemModel.find({ plan_id: id });
  SuccessResponse(res, { message: "Installment plan", plan, items });
};

export const getPosCustomerInstallmentPlans = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const { customerId } = req.params;
  const filter: any = { customer_id: String(customerId) };
  if (warehouseId) filter.warehouse_id = warehouseId;
  const plans = InstallmentPlanModel.find(filter).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  SuccessResponse(res, { message: "Customer installment plans", count: plans.length, plans });
};

export const payPosInstallment = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  const user = req.user as any;
  const { planId, itemId } = req.params;
  const { amount, financials, note } = req.body;

  const plan = InstallmentPlanModel.findById(planId);
  if (!plan) throw new NotFound("Installment plan not found");
  if (warehouseId && String(plan.warehouse_id) !== String(warehouseId)) {
    throw new BadRequest("This plan belongs to another branch");
  }

  const item = InstallmentItemModel.findById(itemId);
  if (!item) throw new NotFound("Installment item not found");

  const payAmount = Number(amount || item.amount || 0);
  const newPaid = (item.paid_amount || 0) + payAmount;
  const remaining = Math.max(0, (item.amount || 0) - newPaid);
  const fullyPaid = remaining <= 0;

  InstallmentItemModel.updateById(itemId, {
    paid_amount: newPaid,
    status: fullyPaid ? "paid" : "pending",
    payment_date: new Date().toISOString(),
    note: note || item.note || "",
  });

  // update plan totals
  const planPaid = (plan.paid_amount || 0) + payAmount;
  const planRemaining = Math.max(0, (plan.total_payable || plan.order_total || 0) - planPaid);
  InstallmentPlanModel.updateById(planId, {
    paid_amount: planPaid,
    remaining_amount: planRemaining,
    status: planRemaining <= 0 ? "completed" : plan.status,
  });

  const updatedItem = InstallmentItemModel.findById(itemId);
  const updatedPlan = InstallmentPlanModel.findById(planId);

  SuccessResponse(res, {
    message: fullyPaid ? "Installment paid successfully" : "Partial payment recorded successfully",
    plan_id: planId,
    installment: updatedItem,
    paid_amount: payAmount,
    installment_remaining: remaining,
    plan: updatedPlan,
  });
};