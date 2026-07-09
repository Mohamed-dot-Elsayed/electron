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

  // ✅ بعد ما الشيفت اتفتح فعلًا
  await CashierModel.updateOne(
    { _id: cashier_id },
    { $set: { cashier_active: true } }
  );

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
  const user = UserModel.findById(userId);

  if (!user) {
    throw new NotFound("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new BadRequest("Wrong password");
  }

  // 2) Get opened shift
  const shifts = CashierShift.find({
    cashierman_id: user._id,
    status: "open",
  });

  const shift = shifts.sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )[0];

  if (!shift) {
    throw new NotFound("No open cashier shift found");
  }

  // 3) Filter date
  const todayStart = new Date();

  todayStart.setHours(0, 0, 0, 0);

  const shiftStartTime = new Date(shift.start_time || Date.now());

  const filterFromDate = new Date(
    Math.max(shiftStartTime.getTime(), todayStart.getTime())
  );

  // 4) Sales
  const sales = SaleModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
    order_pending: 0,
  });

  const completedSales = sales.filter(
    (sale) => new Date(sale.createdAt) >= filterFromDate
  );

  const totalSales = completedSales.reduce(
    (sum, sale) => sum + (sale.grand_total || 0),
    0
  );

  const totalOrders = completedSales.length;

  const saleIds = completedSales.map((sale) => sale._id);

  // 5) Payments grouped by account
  const paymentsByAccount: Record<string, number> = {};

  if (saleIds.length) {
    const payments = PaymentModel.find({});

    payments
      .filter((payment) => saleIds.includes(payment.sale_id))
      .forEach((payment) => {
        payment.financials?.forEach((financial: any) => {
          const accountId = financial.account_id;

          if (!accountId) return;

          paymentsByAccount[accountId] =
            (paymentsByAccount[accountId] || 0) + financial.amount;
        });
      });
  }

  // 6) Expenses
  const expenses = ExpenseModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
  });

  const shiftExpenses = expenses.filter(
    (expense) => new Date(expense.createdAt) >= filterFromDate
  );

  const expensesByAccount: Record<string, number> = {};

  shiftExpenses.forEach((expense) => {
    const accountId = expense.financial_accountId;

    if (!accountId) return;

    expensesByAccount[accountId] =
      (expensesByAccount[accountId] || 0) + expense.amount;
  });

  const totalExpenses = Object.values(expensesByAccount).reduce(
    (sum, value) => sum + value,
    0
  );

  const netCashInDrawer = totalSales - totalExpenses;

  // 7) Accounts
  const allAccountIds = [
    ...new Set([
      ...Object.keys(paymentsByAccount),
      ...Object.keys(expensesByAccount),
    ]),
  ];

  const accounts = BankAccountModel.find();

  const accountsMap = new Map();

  accounts
    .filter((account) => allAccountIds.includes(account._id))
    .forEach((account) => {
      accountsMap.set(account._id, account);
    });

  // 8) Account summary
  const accountRows = allAccountIds.map((id) => {
    const account = accountsMap.get(id);

    const salesAmount = paymentsByAccount[id] || 0;

    const expensesAmount = expensesByAccount[id] || 0;

    return {
      account_id: id,
      name: account?.name || "Unknown",
      salesAmount,
      expensesAmount,
      net: salesAmount - expensesAmount,
    };
  });

  // 9) Expense details
  const expensesRows = shiftExpenses.map((expense, index) => {
    const account = BankAccountModel.findById(expense.financial_accountId);

    return {
      index: index + 1,

      description: expense.name,

      amount: -expense.amount,

      account: account
        ? {
            id: account._id,
            name: account.name,
          }
        : null,
    };
  });

  // 10) Report
  const report = {
    financialSummary: {
      totals: {
        totalSales,
        totalExpenses,
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
  };

  return SuccessResponse(res, {
    message: "Shift report preview (still open)",

    shift: {
      ...shift,

      total_sale_amount: totalSales,

      total_expenses: totalExpenses,

      net_cash_in_drawer: netCashInDrawer,
    },

    report,
  });
};

export const endshiftcashier = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const cashierman_id = jwtUser.id;

  const shift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Shift already ended");
  }

  // ✅ اقفل الشيفت
  shift.end_time = new Date();
  shift.status = "closed";
  await shift.save();

  // ✅ رجّع الكاشير متاح (بدون شروط تقفل التحديث)
  if (shift.cashier_id) {
    await CashierModel.updateOne(
      { _id: shift.cashier_id },
      { $set: { cashier_active: false } }
    );
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
