import "../models/changeLog";
import "../models/appMeta";
import { Request, Response } from "express";
import { runBootstrapAll } from "../services/bootstrap";

export async function testBootstrap(req: Request, res: Response) {
  try {
    await runBootstrapAll();
    res.json({ status: "done" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}