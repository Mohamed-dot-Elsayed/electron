import { Router } from "express";
import {createTaxes,getTaxesById,getTaxes,updateTaxes,deleteTaxes
} from "../controller/Taxes"
import {validate} from"../middlewares/validation";
import {createTaxesSchema,updateTaxesSchema} from "../validation/Taxes"
import { catchAsync } from "../utils/catchAsync";
import {authorizePermissions} from "../middlewares/haspremission"

const route = Router();
route.post("/" ,authorizePermissions("Taxes","Add"),validate(createTaxesSchema), catchAsync(createTaxes));
route.get("/",authorizePermissions("Taxes","View"),catchAsync(getTaxes));
route.get("/:id" ,authorizePermissions("Taxes","View"), catchAsync(getTaxesById));
route.put("/:id" ,authorizePermissions("Taxes","Edit"), validate(updateTaxesSchema), catchAsync(updateTaxes));
route.delete("/:id",authorizePermissions("Taxes","Delete"),catchAsync(deleteTaxes));

export default route;

