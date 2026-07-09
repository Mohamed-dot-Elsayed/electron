import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getTenantInfoController, refreshTenantInfoController } from "../controller/tenant-info";

const router = Router();

/**
 * GET /api/admin/tenant-info
 * 
 * Returns the tenant's subscription package info and feature flags.
 * The frontend can use this to show/hide ecommerce sections in the UI.
 */
router.get(
    "/",
    catchAsync(getTenantInfoController)
);

/**
 * POST /api/admin/tenant-info/refresh
 * 
 * Force clear the tenant cache and fetch fresh data from Super Systego.
 */
router.post(
    "/refresh",
    catchAsync(refreshTenantInfoController)
);

export default router;
