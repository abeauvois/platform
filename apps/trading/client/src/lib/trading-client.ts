import { TradingApiClient } from '@platform/trading-sdk'
import type { ILogger } from '@platform/domain'

/**
 * Simple console logger for browser environment
 */
const consoleLogger: ILogger = {
    info: (message: string) => console.info(`[Trading] ${message}`),
    error: (message: string) => console.error(`[Trading] ${message}`),
    warning: (message: string) => console.warn(`[Trading] ${message}`),
    debug: (message: string) => console.debug(`[Trading] ${message}`),
    await: (message: string) => ({
        start: () => console.info(`[Trading] ${message} (loading...)`),
        update: (msg: string) => console.info(`[Trading] ${msg}`),
        stop: () => console.info(`[Trading] Done`),
    }),
}

/**
 * Trading API Client instance
 * Configured to use the local API server via Vite proxy
 */
export const tradingClient = new TradingApiClient({
    baseUrl: '', // Empty string means same origin (uses Vite proxy)
    logger: consoleLogger,
})
