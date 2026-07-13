import "../models/changeLog";
import "../models/appMeta";
import { Request, Response } from "express";
import { runBootstrapAll } from "../services/bootstrap";
import { pullAllTables } from "../services/pull";
import { pushAllChanges } from "../services/push";

export async function testBootstrap(req: Request, res: Response) {
  try {
    await runBootstrapAll();
    res.json({ status: "done" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function testPull(req: Request, res: Response) {
  try {
    const results = await pullAllTables();
    res.json({ status: "done", results });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function testPush(req: Request, res: Response) {
  try {
    const result = await pushAllChanges();
    res.json({ status: "done", ...result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}