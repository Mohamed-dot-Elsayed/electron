import { DiscountModel } from "../models/discount";
import { SuccessResponse } from "../utils/response";
import { NotFound } from "../Errors";
import { Request, Response } from "express";
import { BadRequest } from "../Errors/BadRequest";

export const createDiscount = async (req: Request, res: Response) => {
  const { name, amount, type, status } = req.body;
  const existingDiscount = await DiscountModel.findOne({ name });
  if (existingDiscount) throw new BadRequest("Discount already exists");
  const discount = await DiscountModel.create({ name, amount, type, status });
  SuccessResponse(res, { message: "Discount created successfully", discount });
};

export const getAllDiscounts = async (req: Request, res: Response) => {
  const discounts = DiscountModel.find();
  SuccessResponse(res, {
    message: "Discounts retrieved successfully",
    discounts,
  });
};

export const updateDiscount = async (req: Request, res: Response) => {
  const { id } = req.params;

  const discount = DiscountModel.updateById(id, req.body);

  if (!discount) {
    throw new NotFound("Discount not found");
  }

  SuccessResponse(res, {
    message: "Discount updated successfully",

    discount,
  });
};

export const deleteDiscount = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;


  const discount =
    DiscountModel.deleteById(id);


  if (!discount) {
    throw new NotFound(
      "Discount not found"
    );
  }


  SuccessResponse(res, {
    message:
      "Discount deleted successfully",

    discount,
  });
};

export const getDiscountById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const discount = await DiscountModel.findById(id);
  if (!discount) throw new NotFound("Discount not found");
  SuccessResponse(res, {
    message: "Discount retrieved successfully",
    discount,
  });
};
