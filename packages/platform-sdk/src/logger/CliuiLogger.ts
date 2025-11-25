import { cliui } from '@poppinss/cliui';
import type { ILogger } from '../ports/ILogger.js';

/**
 * Logger adapter using @poppinss/cliui
 * Implements ILogger interface for terminal output
 */
export class CliuiLogger implements ILogger {
    private readonly ui: ReturnType<typeof cliui>;

    constructor(options?: { mode?: 'raw' | 'silent' | 'normal' }) {
        this.ui = cliui(options);
    }

    info(message: string): void {
        this.ui.logger.info(message);
    }

    error(message: string): void {
        this.ui.logger.error(message);
    }

    warn(message: string): void {
        this.ui.logger.warning(message);
    }

    success(message: string): void {
        this.ui.logger.success(message);
    }
}
