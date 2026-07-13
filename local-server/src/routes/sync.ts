import { Router } from "express";
import { testBootstrap, testPull, testPush } from "../controller/sync";

const router = Router();
router.post("/bootstrap/test", testBootstrap);
router.post("/pull/test", testPull);
router.post("/push/test", testPush);

export default router;