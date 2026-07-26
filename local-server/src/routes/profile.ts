import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getMyProfile, updateMyProfile } from "../controller/profile";

const route = Router();
route.get("/", catchAsync(getMyProfile));
route.put("/", catchAsync(updateMyProfile));
export default route;
