import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(__dirname, "../.env"),
});

import http from "http";
import { Server } from "socket.io";
import express from "express";
import "express-async-errors";
import ApiRoute from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import { startCron } from "./utils/expiry_lowstock";
import cors from "cors";
import cookieParser from "cookie-parser";
import { uploadsRouter } from "./routes/uploadsRoute";

export function createServer() {
  const app = express();

  app.use(cors({ origin: "*" }));
  app.use(cookieParser());
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  app.set("keepAliveTimeout", 1000);
  app.set("headersTimeout", 2000);

  // 🚀 Routes
  app.use("/api", ApiRoute);
  app.use(uploadsRouter);

  app.use((req, res, next) => {
    throw new NotFound("Route not found");
  });

  app.use(errorHandler);

  // ⚙️ Create server & socket.io
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // 🔌 Socket.IO connection
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  // 🕒 Start cron jobs
  startCron(io);

  return server; // http.Server, already wired with express + socket.io
}

// Allows `ts-node src/server.ts` or `node dist/src/server.js` to still work standalone
if (require.main === module) {
  const server = createServer();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}
