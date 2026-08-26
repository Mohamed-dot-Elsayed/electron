import { Router } from "express";
import { testBootstrap, testPull, testPush, testStatus } from "../controller/sync";

const router = Router();
router.post("/bootstrap", testBootstrap);
router.post("/pull", testPull);
router.post("/push", testPush);
router.get("/status", testStatus);

export default router;