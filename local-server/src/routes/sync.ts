import { Router } from "express";
import { testBootstrap, testPull, testPush } from "../controller/sync";

const router = Router();
router.post("/bootstrap", testBootstrap);
router.post("/pull", testPull);
router.post("/push", testPush);

export default router;