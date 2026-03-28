import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Flutter REST API
      '/api': {
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