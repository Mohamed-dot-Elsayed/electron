import { initDb } from './db';
import { createServer } from './app';

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  createServer().listen(PORT, () => {
    console.log(`Local app server running at http://localhost:${PORT}`);
  });
});
