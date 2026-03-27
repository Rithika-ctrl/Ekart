import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Proxy /api calls to Spring Boot backend (runs on :8080)
    // React dev server runs on :5173 — without this, API calls get CORS errors
    proxy: {
      // Flutter/mobile-style REST API used by React pages
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },

      // Server-rendered/admin/session routes that many React pages still call
      '/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/add-product': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },

      // Other backend routes used by fetch() in the React pages
      '/vendor': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/delivery': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/customer': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ajax': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // NOTE: Vite dev server handles SPA fallback automatically.
    // Do NOT add historyApiFallback here — that is a webpack option and is ignored by Vite.
  },
})
