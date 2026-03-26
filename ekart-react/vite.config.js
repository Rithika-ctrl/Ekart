import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Proxy /api calls to Spring Boot backend (runs on :8080)
    // React dev server runs on :5173 — without this, API calls get CORS errors
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // NOTE: Vite dev server handles SPA fallback automatically.
    // Do NOT add historyApiFallback here — that is a webpack option and is ignored by Vite.
  },
})
