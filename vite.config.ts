import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Multi-Page: Landing Page + App
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app:     resolve(__dirname, 'app.html'),
        landing: resolve(__dirname, 'index.html'),
      },
    },
  },

  // sw.js + icons + manifest werden aus public/ kopiert
  publicDir: 'public',

  server: {
    port: 3000,
    open: '/app.html',
  },
})
