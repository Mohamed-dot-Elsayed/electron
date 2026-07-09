import { Request, Response, NextFunction, RequestHandler } from "express";
import { getFeatures, TenantFeatures } from "../utils/tenantService";

/**
 * Middleware factory that gates routes behind a specific feature flag
 * from the tenant's subscription package.
 * 
 * Usage:
 *   router.use(requireFeature('haveEcommerce'));  // blocks all routes in this router
 *   router.get('/orders', requireFeature('haveEcommerce'), getOrders);  // blocks one route
 * 
 * If the feature is not enabled in the plan, responds with 403 Forbidden.
 * If the tenant service is not configured (env vars missing), allows access
 * with a warning log — this prevents blocking in development environments.
 */
export const requireFeature = (featureName: keyof TenantFeatures): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const features = await getFeatures();

            if (!features[featureName]) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 403,
                        message: `This feature is not included in your subscription plan.`,
                        feature: featureName,
                    }
                });
                return;
            }

            // Feature is enabled — proceed
            next();
        } catch (error: any) {
            // If Super Systego is not configured or unreachable,
            // allow access with a warning (don't block in dev/first setup)
            if (error.message?.includes('not configured')) {
                console.warn(`[requireFeature] Tenant verification not configured — allowing access. Set SUPER_SYSTEGO_URL and SUPER_SYSTEGO_API_KEY in .env`);
                return next();
            }

            console.error(`[requireFeature] Error checking feature ${featureName}: ${error.message}`);
            res.status(503).json({
                success: false,
                error: {
                    code: 503,
                    message: 'Unable to verify subscription. Please try again later.',
                }
            });
        }
    };
};
