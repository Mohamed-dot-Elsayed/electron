import express from "express";
import {
  getAllCategorys,
  getAllBrands,
  getProductsByCategory,
  getCashiers,
  getProductsByBrand,
  getAllSelections,
  getFeaturedProducts,
  selectCashier,
  getActiveBundles,
  getWarehouses,
  getAccounts,
  getTaxes,
  getDiscounts,
  getCoupons,
  getGiftCards,
  getPaymentMethods,
  getCustomers,
  getCustomerGroups,
  getDueCustomers,
  getCurrency,
  getCountries,
  getServiceFees,
} from "../controller/POSHomeController";
import { authorizePermissions } from "../middlewares/haspremission";
import { catchAsync } from "../utils/catchAsync";
import { createCustomer } from "../controller/customerGroupController";
import { getProductWarehouseStock } from "../controller/product";

const router = express.Router();

router.get("/categories", authorizePermissions("POS", "View"), getAllCategorys);

router.get("/brands", authorizePermissions("POS", "View"), getAllBrands);

router.get("/bundles", authorizePermissions("POS", "View"), getActiveBundles);

router.get("/cashiers", authorizePermissions("POS", "View"), getCashiers);

router.post(
  "/cashiers/select",
  authorizePermissions("POS", "Add"),
  selectCashier
);

router.get(
  "/categories/:categoryId/products",
  authorizePermissions("POS", "View"),
  getProductsByCategory
);
router.get("/products/:productId/warehouse-stock", getProductWarehouseStock);
router.get(
  "/brands/:brandId/products",
  authorizePermissions("POS", "View"),
  getProductsByBrand
);

router.get(
  "/selections",
  authorizePermissions("POS", "View"),
  getAllSelections
);

router.get(
  "/featured",
  authorizePermissions("POS", "View"),
  getFeaturedProducts
);

router.get("/warehouses", authorizePermissions("POS", "View"), getWarehouses);
router.get("/accounts", authorizePermissions("POS", "View"), getAccounts);
router.get("/taxes", authorizePermissions("POS", "View"), getTaxes);
router.get("/discounts", authorizePermissions("POS", "View"), getDiscounts);
router.get("/coupons", authorizePermissions("POS", "View"), getCoupons);
router.get("/gift-cards", authorizePermissions("POS", "View"), getGiftCards);
router.get(
  "/payment-methods",
  authorizePermissions("POS", "View"),
  getPaymentMethods
);
router.get("/customers", authorizePermissions("POS", "View"), getCustomers);
router.post(
  "/customers",
  authorizePermissions("POS", "Add"),
  authorizePermissions("customer", "Add"),
  catchAsync(createCustomer)
);

router.get(
  "/customer-groups",
  authorizePermissions("POS", "View"),
  getCustomerGroups
);
router.get(
  "/due-customers",
  authorizePermissions("POS", "View"),
  getDueCustomers
);
router.get("/currency", authorizePermissions("POS", "View"), getCurrency);
router.get("/countries", authorizePermissions("POS", "View"), getCountries);
router.get(
  "/service-fees",
  authorizePermissions("POS", "View"),
  getServiceFees
);
export default router;
