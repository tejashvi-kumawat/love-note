import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
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
          if (existsSync(src)) {
            copyFileSync(src, dest)
            console.log('Service Worker copied to dist:', dest)
          } else {
            console.warn('Service Worker file not found at:', src)
          }
        } catch (err) {
          console.error('Error copying Service Worker:', err)
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
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash].[ext]`
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})

