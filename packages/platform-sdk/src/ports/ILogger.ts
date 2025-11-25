/**
 * Domain port: Logger interface
 * Defines contract for logging operations
 */
export interface ILogger {
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    success(message: string): void;
}
