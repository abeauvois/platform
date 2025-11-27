import { cliui } from '@poppinss/cliui';
import type { ILogger } from '@platform/domain';

/**
 * Logger adapter using @poppinss/cliui
 * Implements ILogger interface from domain for terminal output
 */
export class CliuiLogger implements ILogger {
    private readonly ui: ReturnType<typeof cliui>;

    constructor(options?: { mode?: 'raw' | 'silent' | 'normal' }) {
        this.ui = cliui(options);
    }

    info(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.info(this.formatMessage(message, options));
    }

    warning(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.warning(this.formatMessage(message, options));
    }

    error(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.error(this.formatMessage(message, options));
    }

    debug(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.ui.logger.info(this.formatMessage(message, options));
    }

    await(message: string, options?: { prefix?: string; suffix?: string }): {
        start(): void;
        update(message: string, options?: { prefix?: string; suffix?: string }): void;
        stop(): void;
    } {
        const spinner = this.ui.logger.await(this.formatMessage(message, options));
        return {
            start: () => spinner.start(),
            update: (msg: string, opts?: { prefix?: string; suffix?: string }) => {
                spinner.update(this.formatMessage(msg, opts));
            },
            stop: () => spinner.stop(),
        };
    }

    /**
     * Format message with optional prefix and suffix
     */
    private formatMessage(message: string, options?: { prefix?: string; suffix?: string }): string {
        let formatted = message;
        if (options?.prefix) {
            formatted = `${options.prefix} ${formatted}`;
        }
        if (options?.suffix) {
            formatted = `${formatted} ${options.suffix}`;
        }
        return formatted;
    }

    /**
     * Helper method for success messages (for compatibility)
     */
    success(message: string): void {
        this.ui.logger.success(message);
    }
}
