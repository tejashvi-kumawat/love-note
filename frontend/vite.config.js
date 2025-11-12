import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Ensure sw.js is copied to dist with correct MIME type
    {
      name: 'copy-sw',
      closeBundle() {
        const src = join(__dirname, 'public', 'sw.js')
        const dest = join(__dirname, 'dist', 'sw.js')
        try {
          copyFileSync(src, dest)
        } catch (err) {
          // File might not exist during first build
        }
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  publicDir: 'public',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Ensure proper file extensions for MIME type detection
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})

