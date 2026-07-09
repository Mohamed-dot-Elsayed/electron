import Joi from "joi";

export const createExpenseSchema = Joi.object({
name: Joi.string().max(100).required().messages({
    "any.required": "Expense name is required",
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than 0",
  }),
  Category_id: Joi.string().hex().length(24).required().messages({
    "any.required": "Category ID is required",
  }),
  note: Joi.string().allow(null, ""),
  financial_accountId: Joi.string().hex().length(24).required().messages({
    "any.required": "Financial Account ID is required",
  }),
  warehouse_id: Joi.string().hex().length(24).optional(),

});


export const updateExpenseSchema = Joi.object({

  name: Joi.string().max(100).messages({
    "string.max": "Expense name must be at most 100 characters",
  }),
  amount: Joi.number().positive().precision(2).messages({
    "number.positive": "Amount must be greater than 0",
  }),
  Category_id: Joi.string().hex().length(24).messages({
    "string.length": "Category ID must be a valid 24-character hex string",
  }),
  note: Joi.string().allow(null, ""),
  financial_accountId: Joi.string().hex().length(24).messages({
    "string.length": "Financial Account ID must be a valid 24-character hex string",
  }),
  warehouse_id: Joi.string().hex().length(24).optional(),
});