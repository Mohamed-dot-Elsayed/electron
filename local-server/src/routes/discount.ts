import { Router } from "express";
import {
    createDiscount,
    getAllDiscounts,
    updateDiscount,
    deleteDiscount,
    getDiscountById
} from "../controller/discount";
import { catchAsync } from "../utils/catchAsync";
import {authorizePermissions} from "../middlewares/haspremission"

const router = Router();

router.post("/",authorizePermissions("discount","Add"), catchAsync(createDiscount));
router.get("/",authorizePermissions("discount","View"), catchAsync(getAllDiscounts));
router.get("/:id",authorizePermissions("discount","View"), catchAsync(getDiscountById));
router.put("/:id",  authorizePermissions("discount","Edit"), catchAsync(updateDiscount));
router.delete("/:id",authorizePermissions("discount","Delete"), catchAsync(deleteDiscount));

export default router;