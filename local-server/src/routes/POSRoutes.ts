import express from "express";
import {
  createSale,
  getSalePendingById,
  getSales,
  getsalePending,
  getShiftCompletedSales,
  getDueSales,
  payDue,
  getAllSales,
  applyCoupon,
} from "../controller/saleController";
import { catchAsync } from "../utils/catchAsync";
import { authorizePermissions } from "../middlewares/haspremission";
const router = express.Router();

router.post(
  "/apply-coupon",
  authorizePermissions("POS", "Add"),
  catchAsync(applyCoupon)
);
router.post(
  "/sales",
  authorizePermissions("POS", "Add"),
  catchAsync(createSale)
);
router.get(
  "/sales",
  authorizePermissions("POS", "View"),
  catchAsync(getAllSales)
);
router.get(
  "/sales/pending",
  authorizePermissions("POS", "View"),
  catchAsync(getsalePending)
);
router.post(
  "/sales/complete",
  authorizePermissions("POS", "View"),
  catchAsync(getShiftCompletedSales)
);
// ⚠️ Static routes MUST come before dynamic :id routes
router.get(
  "/sales/dues",
  authorizePermissions("POS", "View"),
  catchAsync(getDueSales)
);
router.post(
  "/sales/pay-due",
  authorizePermissions("POS", "Add"),
  catchAsync(payDue)
);
router.get(
  "/sales/sales/pending/:sale_id",
  authorizePermissions("POS", "View"),
  catchAsync(getSalePendingById)
);
router.get(
  "/sales/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getSales)
);

export default router;
