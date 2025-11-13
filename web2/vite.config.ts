import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  publicDir: path.resolve(__dirname, './public'),
  build: {
    outDir: path.resolve(__dirname, './dist')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@google/genai': path.resolve(__dirname, './node_modules/@google/genai'),
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-512x512.svg'],
      manifestFilename: 'manifest.webmanifest',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ]
})
