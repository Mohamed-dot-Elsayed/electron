import { GiftCardModel } from "../models/giftCard";
import { CustomerModel } from "../models/customer";
import { Request, Response } from "express";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";

export const createGiftCard = async (req: Request, res: Response) => {
  const { code, amount, customer_id, expiration_date } = req.body;

  const existingCard = GiftCardModel.findOne({
    code,
  });

  if (existingCard) {
    throw new BadRequest("Gift card code already exists");
  }

  const newGiftCard = GiftCardModel.create({
    code,
    amount,
    customer_id,
    expiration_date,
  });

  SuccessResponse(res, {
    message: "Gift card created successfully",
    newGiftCard,
  });
};

export const getGiftCard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const giftCardRaw = GiftCardModel.findById(id);
  if (!giftCardRaw) {
    throw new NotFound("Gift card not found");
  }

  const customerPop = giftCardRaw.customer_id
    ? CustomerModel.findById(giftCardRaw.customer_id)
    : null;

  const giftCard = {
    ...giftCardRaw,
    customer_id: customerPop
      ? { _id: customerPop._id, name: customerPop.name, email: customerPop.email }
      : null,
  };

  SuccessResponse(res, { giftCard });
};

export const getAllGiftCards = async (
  req: Request,
  res: Response
): Promise<void> => {
  const giftCards = GiftCardModel.find();

  const populatedGiftCards = giftCards.map((giftCard) => {
    const customer = CustomerModel.findById(giftCard.customer_id);

    return {
      ...giftCard,
      customer_id: customer
        ? {
            _id: customer._id,
            name: customer.name,
          }
        : null,
    };
  });

  SuccessResponse(res, {
    giftCards: populatedGiftCards,
  });
};

export const redeemGiftCard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { amount } = req.body;

  const giftCard = await GiftCardModel.findById(id);
  if (!giftCard) {
    throw new NotFound("Gift card not found");
  }

  if (!giftCard.isActive) {
    throw new BadRequest("Gift card is inactive");
  }

  if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
    throw new BadRequest("Gift card has expired");
  }

  // update amount
  giftCard.amount = amount;
  await giftCard.save();
  SuccessResponse(res, {
    message: "Gift card redeemed successfully",
    remainingBalance: giftCard.amount,
  });
};

export const updateGiftCard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const { code, amount, customer_id, expiration_date, isActive } = req.body;

  const giftCard = GiftCardModel.updateById(id, {
    code,
    amount,
    customer_id,
    expiration_date,
    isActive,
  });

  if (!giftCard) {
    throw new NotFound("Gift card not found");
  }

  SuccessResponse(res, {
    message: "Gift card updated successfully",
    giftCard,
  });
};
