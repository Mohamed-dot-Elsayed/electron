import express from "express";
import {
  getSaleForReturn,
  createReturn,
  getAllReturns,
  getReturnById,
  getSaleReturns,
} from "../controller/ReturnSaleController";
import { authorizePermissions } from "../middlewares/haspremission";
import { catchAsync } from "../utils/catchAsync";
const router = express.Router();

router.post(
  "/sale-for-return",
  authorizePermissions("POS", "View"),
  catchAsync(getSaleForReturn)
);
router.post(
  "/create-return",
  authorizePermissions("POS", "Add"),
  catchAsync(createReturn)
);
router.get(
  "/all-returns",
  authorizePermissions("POS", "View"),
  catchAsync(getAllReturns)
);
router.get(
  "/return-by-id",
  authorizePermissions("POS", "View"),
  catchAsync(getReturnById)
);
router.get(
  "/sale-returns",
  authorizePermissions("POS", "View"),
  catchAsync(getSaleReturns)
);

export default router;
