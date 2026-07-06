import { initDb } from './db';
import { createServer } from './app';

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  createServer().listen(PORT, () => {
    console.log(`"Cloud" demo server running at http://localhost:${PORT}`);
  });
});
