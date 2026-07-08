import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173, 
    proxy: {
      '/api': {
        target: process.env.LOCAL_API_URL,
        changeOrigin: true,
      },
    },
  },
});