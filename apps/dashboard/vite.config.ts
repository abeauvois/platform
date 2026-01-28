import { resolve } from 'node:path'

import { defineConfig, type PluginOption } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import tanstackRouter from '@tanstack/router-plugin/vite'

// Environment-based configuration
const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT) || 5000
const API_URL = process.env.API_URL || `http://localhost:${process.env.API_PORT || '3000'}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }) as PluginOption,
    viteReact() as PluginOption,
    tailwindcss() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Resolve workspace packages from source for build
      '@abeauvois/platform-sdk': resolve(__dirname, '../../packages/platform-sdk/src/index.ts'),
      '@abeauvois/platform-core': resolve(__dirname, '../../packages/platform-core/src/index.ts'),
      '@abeauvois/platform-domain/browser': resolve(__dirname, '../../packages/platform-domain/src/browser.ts'),
      '@abeauvois/platform-domain': resolve(__dirname, '../../packages/platform-domain/src/index.ts'),
      '@abeauvois/platform-ingestion/browser': resolve(__dirname, '../../packages/platform-ingestion/src/browser.ts'),
      '@abeauvois/platform-ingestion': resolve(__dirname, '../../packages/platform-ingestion/src/index.ts'),
      '@abeauvois/platform-ui/globals.css': resolve(__dirname, '../../packages/platform-ui/src/styles/globals.css'),
      '@abeauvois/platform-ui': resolve(__dirname, '../../packages/platform-ui/src/index.ts'),
      '@abeauvois/platform-task': resolve(__dirname, '../../packages/platform-task/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Include workspace packages in dependency optimization
    include: ['@abeauvois/platform-sdk', '@abeauvois/platform-domain', '@abeauvois/platform-ui'],
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
})
