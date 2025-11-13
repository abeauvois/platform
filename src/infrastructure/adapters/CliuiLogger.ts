import { cliui } from '@poppinss/cliui';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Adapter: Implements logging using the cliui library
 * Provides rich CLI output with colors, icons, and formatting
 */
export class CliuiLogger implements ILogger {
    private readonly ui: ReturnType<typeof cliui>;

    constructor(options?: { mode?: 'raw' | 'silent' | 'normal' }) {
        this.ui = cliui(options);
    }

    info(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.info(message, options);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.warning(message, options);
    }

    error(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.error(message, options);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.debug(message, options);
    }

    await(message: string, options?: { prefix?: string; suffix?: string }): {
        start(): void;
        update(message: string, options?: { prefix?: string; suffix?: string }): void;
        stop(): void;
    } {
        return this.ui.logger.await(message, options);
    }

    /**
     * Get the underlying cliui instance for advanced usage
     */
    getUi(): ReturnType<typeof cliui> {
        return this.ui;
    }
}
