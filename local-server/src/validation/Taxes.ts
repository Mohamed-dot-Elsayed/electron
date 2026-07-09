import Joi from "joi";

export const createTaxesSchema = Joi.object({
  name: Joi.string().max(100).required(),
  ar_name: Joi.string().max(100).required(),
  status: Joi.boolean().optional().default(true),
  amount: Joi.number().min(0).required(),
  type: Joi.string().valid("percentage", "fixed").required(),
});
export const updateTaxesSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  ar_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
    amount: Joi.number().min(0).optional(),
    type: Joi.string().valid("percentage", "fixed").optional(),
});