import fs from "fs";
import path from "path";
import axios from "axios";
import PQueue from "p-queue"; // use p-queue@6.x for CJS/TS interop, not v7+ (ESM-only)
import { app } from "electron";
import { getPendingImages, markImageStatus } from "../db/imageCache";
import { saveDB } from "../db/db";

const CACHE_ROOT = path.join(app.getPath("userData"), "cache", "uploads");
const queue = new PQueue({ concurrency: 4 });
let passRunning = false;

function localPathForUrl(url: string): string {
  const { pathname } = new URL(url);
  const safe = pathname.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(CACHE_ROOT, safe);
}

async function downloadOne(url: string) {
  const dest = localPathForUrl(url);
  const tmp = dest + ".part";
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  try {
    const res = await axios.get(url, { responseType: "stream", timeout: 15000 });
    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(tmp);
      res.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    fs.renameSync(tmp, dest);
    markImageStatus(url, "downloaded");
  } catch (err: any) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    markImageStatus(url, err?.response?.status === 404 ? "missing" : "failed");
  }
}

export async function runImageDownloadPass() {
  if (passRunning) return; // don't overlap bootstrap-triggered and pull-triggered passes
  passRunning = true;
  try {
    const pending = getPendingImages();
    if (!pending.length) return;
    console.log(`Image downloader: ${pending.length} pending`);
    await Promise.all(pending.map((url) => queue.add(() => downloadOne(url))));
    saveDB();
    console.log("Image downloader: pass complete");
  } finally {
    passRunning = false;
  }
}

// call this — never await it — right after bootstrap/pull finish
export function triggerImageDownload() {
  runImageDownloadPass().catch((err) => console.error("Image download pass failed:", err));
}

export function localCachePathIfExists(urlPath: string): string | null {
  const full = path.join(CACHE_ROOT, urlPath.replace(/\.\./g, "").replace(/^\/+/, ""));
  return fs.existsSync(full) ? full : null;
}

// used by the /uploads/* route for the "online but not cached yet" case
export async function fetchAndCacheOnDemand(remoteUrl: string): Promise<string | null> {
  return queue.add(async () => {
    const dest = localPathForUrl(remoteUrl);
    if (fs.existsSync(dest)) return dest;
    await downloadOne(remoteUrl);
    return fs.existsSync(dest) ? dest : null;
  });
}