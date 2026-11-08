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
  getNextInvoiceNumber,
} from "../controller/saleController";
import { getPosInstallmentSettings, previewPosInstallment, listPosDueInstallments, listPosInstallmentPlans, getPosInstallmentPlan, getPosCustomerInstallmentPlans, payPosInstallment } from "../controller/InstallmentController";
import { getPOSWarehouseProducts, getPOSWarehouseDestinations } from "../controller/POSWarehouseController";
import { createTransfer, getalltransfers, getTransferById, updateTransferStatus, gettransferin, gettransferout } from "../controller/TransferController";
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
router.get('/sales/next-invoice-number', authorizePermissions("POS", "View"), catchAsync(getNextInvoiceNumber));

router.get(
  "/warehouse/products",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseProducts)
);

router.get(
  "/warehouse/destinations",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseDestinations)
);

router.get(
  "/warehouse/:warehouseId",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseProducts)
);

router.get(
  "/transfer",
  authorizePermissions("POS", "View"),
  catchAsync(getalltransfers)
);
router.get(
  "/transfer/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getTransferById)
);
router.post(
  "/transfer",
  authorizePermissions("POS", "Add"),
  catchAsync(createTransfer)
);
router.put(
  "/transfer/:id",
  authorizePermissions("POS", "Add"),
  catchAsync(updateTransferStatus)
);

router.get(
  "/installments/settings",
  authorizePermissions("POS", "View"),
  catchAsync(getPosInstallmentSettings)
);
router.post(
  "/installments/preview",
  authorizePermissions("POS", "View"),
  catchAsync(previewPosInstallment)
);
router.get(
  "/installments/due",
  authorizePermissions("POS", "View"),
  catchAsync(listPosDueInstallments)
);
router.get(
  "/installments/plans",
  authorizePermissions("POS", "View"),
  catchAsync(listPosInstallmentPlans)
);
router.get(
  "/installments/plans/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getPosInstallmentPlan)
);
router.put(
  "/installments/plans/:planId/items/:itemId/pay",
  authorizePermissions("POS", "Edit"),
  catchAsync(payPosInstallment)
);
router.get(
  "/installments/customer/:customerId",
  authorizePermissions("POS", "View"),
  catchAsync(getPosCustomerInstallmentPlans)
);

router.get(
  "/sales/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getSales)
);

export default router;
