import { Request, Response } from "express";
import { ExpenseModel } from "../models/expenses";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound, UnauthorizedError } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { BankAccountModel } from "../models/financialAccount";
import { CashierShift } from "../models/cashierShift";
import { ExpenseCategoryModel } from "../models/expensecategory";
import { CategoryModel } from "../models/category";

export const createExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { name, amount, Category_id, note, financial_accountId } = req.body;

  if (!name || amount == null || !Category_id || !financial_accountId) {
    throw new BadRequest("Please provide all required fields");
  }


  if (amount <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }

  const openShift = CashierShift.find({
    cashierman_id: userId,
    status: "open",
  }).sort(
    (a, b) =>
      new Date(b.start_time).getTime() -
      new Date(a.start_time).getTime()
  )[0];

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating an expense"
    );
  }

  const category = ExpenseCategoryModel.findById(Category_id);

  if (!category) {
    throw new NotFound("Category not found");
  }

  const account = BankAccountModel.findById(financial_accountId);

  if (
    !account ||
    !account.status ||
    !account.in_POS
  ) {
    throw new BadRequest(
      "Financial account is not allowed in POS"
    );
  }

  if (account.balance < amount) {
    throw new BadRequest("Insufficient balance");
  }

  const updatedAccount = BankAccountModel.updateById(
    account._id,
    {
      balance: account.balance - amount,
    }
  );

  const expense = ExpenseModel.create({
    name,
    amount:Number(amount),
    Category_id,
    note,
    financial_accountId,
    shift_id: openShift._id,
    cashier_id: userId,
  });

  SuccessResponse(res, {
    message: "Expense created successfully",
    expense,
    account_balance: updatedAccount?.balance,
  });
};

export const updateExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const { id } = req.params;

  const expense = ExpenseModel.findOne({
    _id: id,
    cashier_id: userId,
  });

  if (!expense) {
    throw new NotFound("Expense not found");
  }

  const newAmount = req.body.amount;

  if (newAmount == null) {
    const updatedExpense = ExpenseModel.updateById(
      expense._id,
      req.body
    );

    return SuccessResponse(res, {
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  }

  if (newAmount <= 0) {
    throw new BadRequest(
      "Amount must be greater than 0"
    );
  }

  const account = BankAccountModel.findById(
    expense.financial_accountId
  );

  if (
    !account ||
    !account.status ||
    !account.in_POS
  ) {
    throw new BadRequest(
      "Financial account not found or is not allowed in POS"
    );
  }

  const balanceDifference =
    expense.amount - newAmount;

  const newBalance =
    account.balance + balanceDifference;

  if (newBalance < 0) {
    throw new BadRequest(
      "Insufficient balance in financial account"
    );
  }

  const updatedAccount =
    BankAccountModel.updateById(
      account._id,
      {
        balance: newBalance,
      }
    );

  const updatedExpense =
    ExpenseModel.updateById(
      expense._id,
      req.body
    );

  SuccessResponse(res, {
    message: "Expense updated successfully",
    expense: updatedExpense,
    account_balance: updatedAccount?.balance,
  });
};

export const getExpenses = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest(
      "User ID is required"
    );
  }

  const openShift = CashierShift.find({
    cashierman_id: userId,
    status: "open",
  }).sort(
    (a, b) =>
      new Date(b.start_time).getTime() -
      new Date(a.start_time).getTime()
  )[0];

  if (!openShift) {
    return SuccessResponse(res, {
      message: "No open shift for this cashier",
      expenses: [],
    });
  }

  const expenses = ExpenseModel.find({
    cashier_id: userId,
    shift_id: openShift._id,
  });

  const populatedExpenses = expenses.map(
    (expense) => {
      const category =
        ExpenseCategoryModel.findById(
          expense.Category_id
        );

      const account =
        BankAccountModel.findById(
          expense.financial_accountId
        );

      return {
        ...expense,

        Category_id: category
          ? {
              _id: category._id,
              name: category.name,
              ar_name: category.ar_name,
            }
          : null,

        financial_accountId: account
          ? {
              _id: account._id,
              name: account.name,
              ar_name: account.ar_name,
            }
          : null,
      };
    }
  );

  SuccessResponse(res, {
    message: "Expenses retrieved successfully",
    expenses: populatedExpenses,
  });
};

export const selectionExpense = async (req: Request, res: Response) => {
  const categories = await ExpenseCategoryModel.find({ status: true });
  const accounts = await BankAccountModel.find({ in_POS: true, status: true });

  SuccessResponse(res, {
    message: "Selection data retrieved successfully",
    categories,
    accounts,
  });
};

export const getExpenseById = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new BadRequest("User ID is required");

  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  const expenseRaw = ExpenseModel.findOne({ _id: id, cashier_id: userId });
  if (!expenseRaw) throw new NotFound("Expense not found");

  const categoryPop = expenseRaw.Category_id
    ? CategoryModel.findById(expenseRaw.Category_id)
    : null;

  const financialAccountPop = expenseRaw.financial_accountId
    ? BankAccountModel.findById(expenseRaw.financial_accountId)
    : null;

  const expense = {
    ...expenseRaw,
    Category_id: categoryPop
      ? { _id: categoryPop._id, name: categoryPop.name, ar_name: categoryPop.ar_name }
      : null,
    financial_accountId: financialAccountPop
      ? { _id: financialAccountPop._id, name: financialAccountPop.name, ar_name: financialAccountPop.ar_name }
      : null,
  };

  SuccessResponse(res, { message: "Expense retrieved successfully", expense });
};
