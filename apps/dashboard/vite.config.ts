import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import tanstackRouter from '@tanstack/router-plugin/vite'

// Environment-based configuration
const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT) || 5000
const API_URL = process.env.API_URL || `http://localhost:${process.env.API_PORT || '3000'}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: DASHBOARD_PORT,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
