import express from "express";
import {
  createGiftCard,
  getGiftCard,
  redeemGiftCard,
  updateGiftCard,
  getAllGiftCards,
} from "../controller/giftCardController";
import { authorizePermissions } from "../middlewares/haspremission";

const router = express.Router();

router.post(
  "/",
  authorizePermissions("POS", "Add"),
  authorizePermissions("gift_card", "Add"),
  createGiftCard
);
router.get(
  "/",
  authorizePermissions("POS", "View"),
  authorizePermissions("gift_card", "View"),
  getAllGiftCards
);
router.get(
  "/:id",
  authorizePermissions("POS", "View"),
  authorizePermissions("gift_card", "View"),
  getGiftCard
);
router.put(
  "/:id",
  authorizePermissions("POS", "Edit"),
  authorizePermissions("gift_card", "Edit"),
  updateGiftCard
);
router.post(
  "/:id/redeem",
  authorizePermissions("POS", "Edit"),
  authorizePermissions("gift_card", "Edit"),
  redeemGiftCard
);

export default router;
