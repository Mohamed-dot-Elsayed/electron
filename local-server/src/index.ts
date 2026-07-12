// e.g. src/index.ts (wherever startServer() is defined)
import { initDb } from "./db/db";
import { createServer } from "./server";
import { runBootstrapAll } from "./services/bootstrap";
const PORT = process.env.PORT || 3000;
async function startServer() {
  await initDb();
  const server = createServer();

  return new Promise((resolve, reject) => {
    const serverInstance = server.listen(PORT, () => {
      console.log(`Local server listening on http://localhost:${PORT}`);
      resolve(serverInstance);

      runBootstrapAll().catch((err) => {
        console.error("Bootstrap failed, will resume next launch:", err);
      });
    });
    serverInstance.on("error", reject);
  });
}

module.exports = { startServer };
// or export { startServer }; if this file is ESM/ts