import Joi from "joi";

export const loginSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.email": "Invalid email format",
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required",
    }),
});

export const signupSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username cannot exceed 50 characters",
    "any.required": "Username is required",
    
  }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  company_name: Joi.string().optional(),
  address: Joi.string().optional(),
  vat_number: Joi.string().optional(),
  state: Joi.string().optional(),
  postal_code: Joi.string().optional(),
  imageBase64: Joi.string().optional(),
  image_url: Joi.string().optional(),   
  role: Joi.string().valid("superadmin", "admin").optional(), 
});
