/**
 * @abeauvois/platform-cached-http-client
 * 
 * Generic HTTP client with caching, throttling, and retry logic
 * 
 * @example
 * ```typescript
 * import { CachedHttpClient, type ILogger } from '@abeauvois/platform-cached-http-client';
 * 
 * const logger: ILogger = {
 *   info: (msg) => console.log(msg),
 *   warning: (msg) => console.warn(msg),
 *   error: (msg) => console.error(msg)
 * };
 * 
 * const client = new CachedHttpClient<string>(logger, {
 *   throttleMs: 1000,
 *   retries: 3
 * });
 * ```
 */

export { CachedHttpClient, type CachedHttpClientOptions } from './CachedHttpClient.js';
export { type ILogger } from './ILogger.js';
