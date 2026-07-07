import { initDb } from './db';
import { createServer } from './app';
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(__dirname, "../.env")
});
console.log("__dirname:", __dirname);
console.log("env path:", path.join(__dirname, "../.env"));

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  createServer().listen(PORT, () => {
    console.log(`Local wow app server running at http://localhost:${PORT}`);
  });
});
