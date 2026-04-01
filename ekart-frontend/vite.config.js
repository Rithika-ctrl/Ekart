import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost',
    // SPA fallback: serve index.html for any non-asset path so that
    // react-router-dom routes like /shop/cart or /admin/orders work
    // when the user hits refresh or pastes a direct URL.
    historyApiFallback: true,
    proxy: {
      // Flutter REST API — proxied to Spring Boot in dev
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Web admin/policy endpoints used by AdminApp
      '/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OAuth2 initiation — browser follows redirect chain to Google and back
      '/oauth2/authorize': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2/authorization': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  }
})