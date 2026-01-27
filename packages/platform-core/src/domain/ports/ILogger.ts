/**
 * Port: Defines interface for logging across the application
 * This abstraction allows us to decouple logging implementation from domain logic
 */
export interface ILogger {
    /**
     * Log an informational message
     * @param message The message to log
     * @param options Optional prefix and suffix for the message
     */
    info(message: string, options?: { prefix?: string; suffix?: string }): void;

    /**
     * Log a warning message
     * @param message The message to log
     * @param options Optional prefix and suffix for the message
     */
    warning(message: string, options?: { prefix?: string; suffix?: string }): void;

    /**
     * Log an error message
     * @param message The message to log
     * @param options Optional prefix and suffix for the message
     */
    error(message: string, options?: { prefix?: string; suffix?: string }): void;

    /**
     * Log a debug message
     * @param message The message to log
     * @param options Optional prefix and suffix for the message
     */
    debug(message: string, options?: { prefix?: string; suffix?: string }): void;

    /**
     * Create a loading animation with a message
     * @param message The message to display with the loading animation
     * @param options Optional prefix and suffix for the message
     * @returns An object with start(), update(), and stop() methods
     */
    await(message: string, options?: { prefix?: string; suffix?: string }): {
        start(): void;
        update(message: string, options?: { prefix?: string; suffix?: string }): void;
        stop(): void;
    };
}
