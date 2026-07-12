import { Router } from "express";
import { testBootstrap } from "../controller/sync";

const router = Router();
router.post("/bootstrap/test", testBootstrap);

export default router;