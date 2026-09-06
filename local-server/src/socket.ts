import { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setSocketIO(io: Server) {
  ioInstance = io;
}

export function getSocketIO(): Server | null {
  return ioInstance;
}

export interface SyncProgressPayload {
  type: "bootstrap" | "pull" | "push" | "summary" | "error";
  status: "started" | "progress" | "completed" | "error";
  message: string;
  table?: string;
  current?: number;
  total?: number;
  percent: number;
  summary?: {
    pull: string;
    push: string;
  };
}

export function emitSyncProgress(payload: SyncProgressPayload) {
  if (ioInstance) {
    ioInstance.emit("sync-progress", payload);
  }
}
