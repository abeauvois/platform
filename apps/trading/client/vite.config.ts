import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import tanstackRouter from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

/**
 * Vite Configuration for Trading Client
 *
 * This configuration sets up:
 *
 * 1. Plugins:
 *    - TanStack Router: Provides file-based routing with automatic code splitting
 *    - React: Enables React Fast Refresh and JSX support
 *    - Tailwind CSS: Integrates Tailwind CSS compilation
 *
 * 2. Path Alias:
 *    - '@': Maps to './src' for cleaner imports (e.g., '@/components/Header')
 *
 * 3. Development Server Proxy (Hybrid Backend):
 *    - Trading APIs (/api/trading/*) -> Trading server (port 3001)
 *    - Auth & shared APIs (/api/auth/*, /api/bookmarks/*, /api/todos/*) -> Platform API (port 3000)
 *
 * 4. Testing:
 *    - Uses jsdom environment for browser-like testing
 *    - Loads setup file for test configuration
 *
 * @see https://vitejs.dev/config/
 */
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
    port: 5001,
    proxy: {
      // Trading-specific APIs -> Trading server
      '/api/trading': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/docs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Auth and shared features -> Central platform server
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/api/bookmarks': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/api/todos': {
        target: 'http://localhost:3000',
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
