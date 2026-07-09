import express from "express";
import {
  createCustomerGroup,
  getallgroups,
  getCustomers,
  createCustomer,
} from "../controller/customerGroupController";
import { catchAsync } from "../utils/catchAsync";
import { authorizePermissions } from "../middlewares/haspremission";

const router = express.Router();

router.post(
  "/",
  authorizePermissions("POS", "Add"),
  authorizePermissions("customer_group", "Add"),
  catchAsync(createCustomerGroup)
);
router.get(
  "/",
  authorizePermissions("POS", "View"),
  authorizePermissions("customer_group", "View"),
  catchAsync(getallgroups)
);
router.get(
  "/customers",
  authorizePermissions("POS", "View"),
  authorizePermissions("customer_group", "View"),
  catchAsync(getCustomers)
);
router.post(
  "/customer",
  authorizePermissions("POS", "Add"),
  authorizePermissions("customer", "Add"),
  catchAsync(createCustomer)
);

export default router;
