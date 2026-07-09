import express from "express";
import {
  startcashierShift,
  endShiftWithReport,
  endshiftcashier,
  logout,
} from "../controller/CashierShiftController";

import { authorizePermissions } from "../middlewares/haspremission";
const router = express.Router();

router.post(
  "/start",
  authorizePermissions("POS", "Add"),
  authorizePermissions("cashier_shift", "Add"),
  startcashierShift
);
router.post("/logout", authorizePermissions("POS", "Add"), logout);
router.put(
  "/end",
  authorizePermissions("POS", "Edit"),
  authorizePermissions("cashier_shift", "Edit"),
  endshiftcashier
);
router.put(
  "/end/report",
  authorizePermissions("POS", "Edit"),
  authorizePermissions("cashier_shift_report", "Edit"),
  endShiftWithReport
);

export default router;
