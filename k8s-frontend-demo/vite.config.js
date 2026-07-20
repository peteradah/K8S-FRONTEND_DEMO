import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During local `npm run dev`, proxy /api and /healthz to a locally running
// backend (or to this same box) so the app behaves the same as it will
// behind the nginx container in Kubernetes. Override DEV_BACKEND if your
// local backend runs somewhere other than localhost:8080.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': process.env.DEV_BACKEND || 'http://localhost:8080',
    },
  },
})
