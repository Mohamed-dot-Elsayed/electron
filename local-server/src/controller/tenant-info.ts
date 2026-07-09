import { Request, Response } from "express";
import { SuccessResponse } from "../utils/response";
import { getTenantInfo, clearCache } from "../utils/tenantService";
import { catchAsync } from "../utils/catchAsync";

export const getTenantInfoController = catchAsync(async (req: Request, res: Response) => {
    try {
        const tenantInfo = await getTenantInfo();
        return SuccessResponse(res, {
            message: "Tenant info retrieved successfully",
            ...tenantInfo,
        }, 200);
    } catch (error: any) {
        // If tenant service is not configured, return a default "all features enabled" response
        if (error.message?.includes("not configured")) {
            return SuccessResponse(res, {
                message: "Tenant verification not configured — all features enabled by default",
                tenant: null,
                features: { haveEcommerce: true, haveMobileApp: true },
                package: null,
            }, 200);
        }
        throw error;
    }
});

export const refreshTenantInfoController = catchAsync(async (req: Request, res: Response) => {
    clearCache();
    const tenantInfo = await getTenantInfo();
    return SuccessResponse(res, {
        message: "Tenant info refreshed successfully",
        ...tenantInfo,
    }, 200);
});