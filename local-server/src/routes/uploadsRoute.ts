import express from "express";
import { Request, Response } from 'express';
import { localCachePathIfExists, fetchAndCacheOnDemand } from "../services/imageDownloader";

const REMOTE_UPLOADS_BASE = process.env.REMOTE_API_URL; // same host your images live under

export const uploadsRouter = express.Router();

uploadsRouter.get("/uploads/*", async (req: Request, res: Response) => {
  const remotePath = req.params[0] as string;  
  if (!remotePath || remotePath.includes("..")) return res.status(400).end();

  const cached = localCachePathIfExists(`/uploads/${remotePath}`);
  if (cached) {
    return res.sendFile(cached, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
  }

  const remoteUrl = `${REMOTE_UPLOADS_BASE}/uploads/${remotePath}`;
  const fetched = await fetchAndCacheOnDemand(remoteUrl); // internally no-ops to null on failure/offline
  if (!fetched) return res.status(404).end();

  return res.sendFile(fetched, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
});