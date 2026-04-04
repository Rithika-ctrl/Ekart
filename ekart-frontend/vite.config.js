import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // SPA fallback: serve index.html for any non-asset path so that
    // react-router-dom routes like /shop/cart or /admin/orders work
    // when the user hits refresh or pastes a direct URL.
    historyApiFallback: true,
    proxy: {
      // EKART Backend API - Spring Boot
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  }
})