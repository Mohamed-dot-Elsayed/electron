import { Request, Response } from "express";
import { CashierShift } from "../models/cashierShift";
import { SaleModel } from "../models/sale";
import { SuccessResponse } from "../utils/response";
import { NotFound, UnauthorizedError } from "../Errors";
import { BadRequest } from "../Errors/BadRequest";
import { UserModel } from "../models/user";
import { PositionModel } from "../models/position";
import bcrypt from "bcryptjs";
import { ExpenseModel } from "../models/expenses";
import { CashierModel } from "../models/cashier";
import { PaymentModel } from "../models/payment";
import { BankAccountModel } from "../models/financialAccount";
import { ReturnModel } from "../models/returnSale";

// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك

export const startcashierShift = async (req: Request, res: Response) => {
  const cashierman_id = req.user?.id;
  const warehouseId = (req.user as any)?.warehouse_id;
  const { cashier_id } = req.body;

  if (!cashierman_id) throw new NotFound("User not found");
  if (!warehouseId) throw new NotFound("Warehouse ID is required");

  // ✅ هل اليوزر عنده شيفت مفتوح؟
  const existingShift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  });

  if (existingShift) {
    const cashierDoc = await CashierModel.findById(existingShift.cashier_id);

    return SuccessResponse(res, {
      message: "You already have an open shift",
      isExisting: true,
      shift: existingShift,
      cashier: cashierDoc,
    });
  }

  if (!cashier_id) {
    throw new BadRequest("Cashier ID is required");
  }

  // 🔥 check من الـ shift
  const busyShift = await CashierShift.findOne({
    cashier_id,
    status: "open",
  });

  if (busyShift) {
    throw new BadRequest("Cashier already has an open shift");
  }

  const cashierDoc = await CashierModel.findOne({
    _id: cashier_id,
    warehouse_id: warehouseId,
    status: true,
  });

  if (!cashierDoc) {
    throw new NotFound("Cashier not found");
  }

  // ✅ افتح الشيفت
  const cashierShift = await CashierShift.create({
    start_time: new Date(),
    cashierman_id,
    cashier_id,
    status: "open",
  });

  CashierModel.updateById(cashier_id,{ cashier_active: true})

  SuccessResponse(res, {
    message: "Cashier shift started successfully",
    shift: cashierShift,
    cashier: cashierDoc,
  });
};

export const endShiftWithReport = async (req: Request, res: Response) => {
    const { password } = req.body;
    const jwtUser = req.user as any;

    if (!jwtUser) {
        throw new UnauthorizedError("Unauthorized");
    }

    const userId = jwtUser.id;

    // 1) Check user and password
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new NotFound("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new BadRequest("Wrong password");
    }

    // 2) Get opened shift
    const shift = await CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    })

    if (!shift) {
        throw new NotFound("No open cashier shift found");
    }

    // 3) Filter date
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const shiftStartTime = new Date(shift.start_time || Date.now());
    const filterFromDate = new Date(Math.max(shiftStartTime.getTime(), todayStart.getTime()));

    // 4) Sales
    const allSales = SaleModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
        order_pending: 0,
    });

    const completedSales = allSales.filter(
        (sale: any) => new Date(sale.createdAt) >= filterFromDate
    );

    const totalSales = completedSales.reduce((sum, sale: any) => sum + (sale.grand_total || 0), 0);
    const totalOrders = completedSales.length;
    const saleIds = completedSales.map((sale: any) => sale._id);

    // 5) Payments grouped by account
    const paymentsByAccount: Record<string, number> = {};

    if (saleIds.length) {
        const payments = PaymentModel.find({ sale_id: { $in: saleIds } });

        payments.forEach((payment: any) => {
            payment.financials?.forEach((financial: any) => {
                const accountId = financial.account_id?.toString();
                if (!accountId) return;
                paymentsByAccount[accountId] = (paymentsByAccount[accountId] || 0) + financial.amount;
            });
        });
    }

    // 6) Expenses
    const allExpenses = await ExpenseModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
    });

    const shiftExpenses = allExpenses.filter(
        (expense: any) => new Date(expense.createdAt) >= filterFromDate
    );

    const expensesByAccount: Record<string, number> = {};

    shiftExpenses.forEach((expense: any) => {
        const accountId = expense.financial_accountId?.toString();
        if (!accountId) return;
        expensesByAccount[accountId] = (expensesByAccount[accountId] || 0) + expense.amount;
    });

    const totalExpenses = Object.values(expensesByAccount).reduce((sum, v) => sum + v, 0);

    // 7) Returns (NEW — subtract from drawer, mirrors expenses grouping)
    const shiftReturns = ReturnModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
    });

    const returnsByAccount: Record<string, number> = {};
    let unassignedReturnsAmount = 0;

    shiftReturns.forEach((ret: any) => {
        const accountId = ret.refund_account_id?.toString();
        if (accountId) {
            returnsByAccount[accountId] = (returnsByAccount[accountId] || 0) + ret.total_amount;
        } else {
            // cash refunds / no specific account tied to the refund
            unassignedReturnsAmount += ret.total_amount;
        }
    });

    const totalReturns = shiftReturns.reduce((sum, ret: any) => sum + (ret.total_amount || 0), 0);

    // 8) Net cash now factors in returns
    const netCashInDrawer = totalSales - totalExpenses - totalReturns;

    // 9) Accounts (sales + expenses + returns all merged)
    const allAccountIds = [
        ...new Set([
            ...Object.keys(paymentsByAccount),
            ...Object.keys(expensesByAccount),
            ...Object.keys(returnsByAccount),
        ]),
    ];

    const accounts = allAccountIds.length
        ? await BankAccountModel.find({ _id: { $in: allAccountIds } })
        : [];

    const accountsMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

    // 10) Account summary
    const accountRows = allAccountIds.map((id) => {
        const account = accountsMap.get(id);
        const salesAmount = paymentsByAccount[id] || 0;
        const expensesAmount = expensesByAccount[id] || 0;
        const returnsAmount = returnsByAccount[id] || 0;

        return {
            account_id: id,
            name: account?.name || "Unknown",
            salesAmount,
            expensesAmount,
            returnsAmount,
            net: salesAmount - expensesAmount - returnsAmount,
        };
    });

    // 11) Expense details
    const expensesRows = shiftExpenses.map((expense: any, index: number) => {
        const account = accountsMap.get(expense.financial_accountId?.toString());
        return {
            index: index + 1,
            description: expense.name,
            amount: -expense.amount,
            account: account ? { id: account._id, name: account.name } : null,
        };
    });

    // 12) Return details
    const returnsRows = shiftReturns.map((ret: any, index: number) => {
        const account = ret.refund_account_id
            ? accountsMap.get(ret.refund_account_id.toString())
            : null;
        return {
            index: index + 1,
            reference: ret.reference,
            sale_reference: ret.sale_reference,
            amount: -ret.total_amount,
            refund_method: ret.refund_method,
            account: account ? { id: account._id, name: account.name } : null,
        };
    });

    // 13) Report
    const report = {
        financialSummary: {
            totals: {
                totalSales,
                totalExpenses,
                totalReturns,
                unassignedReturnsAmount,
                netCashInDrawer,
            },
            accounts: accountRows,
        },
        ordersSummary: {
            totalOrders,
        },
        expenses: {
            rows: expensesRows,
            total: totalExpenses,
        },
        returns: {
            rows: returnsRows,
            total: totalReturns,
        },
    };

    return SuccessResponse(res, {
        message: "Shift report preview (still open)",
        shift: {
            ...shift,
            total_sale_amount: totalSales,
            total_expenses: totalExpenses,
            total_returns: totalReturns,
            net_cash_in_drawer: netCashInDrawer,
        },
        report,
    });
};

export const endshiftcashier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const jwtUser = req.user as any;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const cashierman_id = jwtUser.id;

  console.log("id :",id);
  console.log(cashierman_id);
  const shift = await CashierShift.findOne({
    cashierman_id,
    cashier_id:id,
    status: "open",
  });
  
  

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Shift already ended");
  }
  console.log("like ",shift._id);
  
  // ✅ اقفل الشيفت
  CashierShift.updateById(shift._id,{end_time : new Date(), status:"closed"})
  // ✅ رجّع الكاشير متاح (بدون شروط تقفل التحديث)
  if (shift.cashier_id) {
    CashierModel.updateById(shift.cashier_id,{cashier_active: false})
  }

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
  });
};

export const getCashierUsers = async (req: Request, res: Response) => {
  // 1️⃣ هات Position اللي اسمه Cashier
  const cashierPosition = await PositionModel.findOne({ name: "Cashier" });

  if (!cashierPosition) {
    throw new NotFound("Cashier position not found");
  }

  // 2️⃣ هات كل Users اللي positionId بتاعهم = ID بتاع Cashier
  const users = UserModel.find({
    positionId: cashierPosition._id,
  }).map((user) => {
    const { password_hash, ...safeUser } = user;

    return safeUser;
  });

  // 3️⃣ رجّع الرد
  SuccessResponse(res, {
    message: "Cashier users fetched successfully",
    users,
  });
};

//logout for cashiershift without token invalidation
export const logout = async (req: Request, res: Response) => {
  return SuccessResponse(res, {
    message: "Logged out successfully",
  });
};
