import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import {
  createBooking,
  getPOSBookings,
  payRemaining,
} from "../controller/BookingController";
import { authorizePermissions } from "../middlewares/haspremission";

const route = Router();

route.post("/", authorizePermissions("POS", "Add"), catchAsync(createBooking));
route.get("/", authorizePermissions("POS", "View"), catchAsync(getPOSBookings));
route.patch(
  "/pay-remaining/:id",
  authorizePermissions("POS", "Add"),
  catchAsync(payRemaining)
);

export default route;
