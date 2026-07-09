import { Request, Response } from "express";
import { TaxesModel } from "../models/taxes";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";

export const createTaxes = async (req: Request, res: Response) => {
  const { name, ar_name, status, amount, type } = req.body;
  if (!name || !amount || !type) {
    throw new BadRequest(" name, amount, type  are required");
  }
  const existingTax = await TaxesModel.findOne({ name });
  if (existingTax) throw new BadRequest("Tax already exists");
  const tax = await TaxesModel.create({ name, ar_name, status, amount, type });
  SuccessResponse(res, { message: "Tax created successfully", tax });
};

export const getTaxes = async (req: Request, res: Response) => {
  const taxes = await TaxesModel.find();
  SuccessResponse(res, { message: "Get taxes successfully", taxes });
};

export const getTaxesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Tax ID is required");
  const tax = await TaxesModel.findById(id);
  if (!tax) throw new NotFound("Tax not found");
  SuccessResponse(res, { message: "Get tax successfully", tax });
};

export const deleteTaxes = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequest("Tax ID is required");
  }

  const tax = TaxesModel.deleteById(id);

  if (!tax) {
    throw new NotFound("Tax not found");
  }

  SuccessResponse(res, {
    message: "Tax deleted successfully",
  });
};

export const updateTaxes = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequest("Tax ID is required");
  }

  const tax = TaxesModel.updateById(id, req.body);

  if (!tax) {
    throw new NotFound("Tax not found");
  }

  SuccessResponse(res, {
    message: "Tax updated successfully",

    tax,
  });
};
