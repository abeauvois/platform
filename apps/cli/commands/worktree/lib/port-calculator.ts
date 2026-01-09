import type { PortConfig } from './types.js';
import { BASE_PORTS } from './types.js';

/**
 * Calculate ports with the given offset
 */
export function calculatePorts(offset: number): PortConfig {
  return {
    apiPort: BASE_PORTS.apiPort + offset,
    dashboardPort: BASE_PORTS.dashboardPort + offset,
    tradingServerPort: BASE_PORTS.tradingServerPort + offset,
    tradingClientPort: BASE_PORTS.tradingClientPort + offset,
  };
}

/**
 * Format ports as a displayable table
 */
export function formatPortTable(ports: PortConfig): string {
  return [
    `  API:            ${ports.apiPort}`,
    `  Dashboard:      ${ports.dashboardPort}`,
    `  Trading Server: ${ports.tradingServerPort}`,
    `  Trading Client: ${ports.tradingClientPort}`,
  ].join('\n');
}

/**
 * Validate that offset is a valid port offset
 */
export function isValidOffset(offset: number): boolean {
  return !isNaN(offset) && offset >= 0 && offset % 100 === 0;
}
