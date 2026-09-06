import "../models/changeLog";
import "../models/appMeta";
import { Request, Response } from "express";
import { runBootstrapAll } from "../services/bootstrap";
import { pullAllTables } from "../services/pull";
import { pushAllChanges } from "../services/push";
import axios from "axios";
import { resetAutoSyncTimer } from "../services/autoSync";
import { isBootstrapDone } from "../services/appMeta";

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
    resetAutoSyncTimer(); // Reset the auto-sync timer after a successful pull
    res.json({ status: "done", results, syncTime: new Date().toISOString() });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function testPush(req: Request, res: Response) {
  try {
    const result = await pushAllChanges();
    resetAutoSyncTimer(); // Reset the auto-sync timer after a successful push
    res.json({ status: "done", ...result, syncTime: new Date().toISOString() });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function testStatus(req: Request, res: Response) {
  try {
    const REMOTE_BASE =
      process.env.REMOTE_API_URL || "https://bcknd.systego.net";
    await axios.get(`${REMOTE_BASE}/api/sync/pull`, {
      params: { since: "1970-01-01T00:00:00.000Z", clientId: "ping" },
      timeout: 2500,
    });
    res.json({ status: "done", online: true });
  } catch (err: any) {
    if (err.response) {
      res.json({ status: "done", online: true });
    } else {
      res.json({ status: "done", online: false });
    }
  }
}

export async function checkBootstrapStatus(req: Request, res: Response) {
  try {
    const needed = !isBootstrapDone();
    res.json({ needed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
