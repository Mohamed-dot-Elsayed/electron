import { Router } from "express";
import {
    getAllOnlineOrders,
    getOnlineOrderById,
    updateOnlineOrderStatus,
} from "../controller/onlineOrders";
import { authorizePermissions } from "../middlewares/haspremission";
import { catchAsync } from "../utils/catchAsync";

const router = Router();

router.get("/", authorizePermissions("orders", "View"), catchAsync(getAllOnlineOrders));
router.get("/:id", authorizePermissions("orders", "View"), catchAsync(getOnlineOrderById));
router.put("/:id/status", authorizePermissions("orders", "Edit"), catchAsync(updateOnlineOrderStatus));

export default router;
