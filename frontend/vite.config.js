import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/3dModellingv2/',
  plugins: [react()],
  server: {
    proxy: {
      '/frames': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
    }
  }
})
