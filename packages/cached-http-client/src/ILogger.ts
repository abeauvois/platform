/**
 * Logger interface for CachedHttpClient
 * Implement this interface to provide custom logging
 */
export interface ILogger {
    info(message: string): void;
    warning(message: string): void;
    error(message: string): void;
}
