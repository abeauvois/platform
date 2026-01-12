import { loadEnv, defineConfig, type PluginOption } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import tanstackRouter from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

// Load env from monorepo root for worktree port configuration
const rootEnv = loadEnv('development', resolve(__dirname, '../../..'), '')

// Environment-based configuration (prefer root env, fallback to process.env)
const TRADING_CLIENT_PORT = Number(rootEnv.TRADING_CLIENT_PORT || process.env.TRADING_CLIENT_PORT) || 5001
const TRADING_SERVER_URL = rootEnv.TRADING_SERVER_URL || process.env.TRADING_SERVER_URL || `http://localhost:${rootEnv.TRADING_SERVER_PORT || process.env.TRADING_SERVER_PORT || '3001'}`
const API_URL = rootEnv.API_URL || process.env.API_URL || `http://localhost:${rootEnv.API_PORT || process.env.API_PORT || '3000'}`

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
 *    - Trading APIs (/api/trading/*) -> Trading server (configured via TRADING_SERVER_URL)
 *    - Auth & shared APIs (/api/auth/*, /api/bookmarks/*) -> Platform API (configured via API_URL)
 *
 * @see https://vitejs.dev/config/
 */
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
      '@platform/trading-sdk': resolve(__dirname, '../../../packages/trading-sdk/src/index.ts'),
      '@platform/trading-domain': resolve(__dirname, '../../../packages/trading-domain/src/index.ts'),
      '@platform/sdk': resolve(__dirname, '../../../packages/platform-sdk/src/index.ts'),
      '@platform/platform-domain/browser': resolve(__dirname, '../../../packages/platform-domain/src/browser.ts'),
      '@platform/platform-domain': resolve(__dirname, '../../../packages/platform-domain/src/index.ts'),
      '@platform/ui/globals.css': resolve(__dirname, '../../../packages/platform-ui/src/styles/globals.css'),
      '@platform/ui': resolve(__dirname, '../../../packages/platform-ui/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Exclude aliased packages from pre-bundling since we resolve them to source
    exclude: ['@platform/trading-sdk', '@platform/trading-domain', '@platform/sdk', '@platform/platform-domain', '@platform/ui'],
  },
  server: {
    port: TRADING_CLIENT_PORT,
    proxy: {
      // Trading-specific APIs -> Trading server
      '/api/trading': {
        target: TRADING_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      '/api/docs': {
        target: TRADING_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      // Auth and shared features -> Central platform server
      '/api/auth': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
      },
      '/api/bookmarks': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
