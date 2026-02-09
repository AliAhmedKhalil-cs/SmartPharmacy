import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001'  // ← غيّر إلى 3001

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target,  // http://127.0.0.1:3001
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path  // Keep /api in the path
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
