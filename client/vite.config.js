import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: mode === 'electron' ? './' : '/point-of-sale',
  define: {
    'import.meta.env.VITE_IS_ELECTRON': JSON.stringify(mode === 'electron' ? 'true' : 'false'),
  },
  envPrefix: 'VITE_'
}))