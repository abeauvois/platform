import { cliui } from '@poppinss/cliui';
import type { ILogger } from '@abeauvois/platform-domain';

/**
 * Logger adapter using @poppinss/cliui.
 * Implements ILogger interface for terminal output.
 *
 * Note: Requires @poppinss/cliui as a peer dependency.
 */
export class CliuiLogger implements ILogger {
    private readonly ui: ReturnType<typeof cliui>;

    constructor(options?: { mode?: 'raw' | 'silent' | 'normal' }) {
        this.ui = cliui(options);
    }

    info(message: string): void {
        this.ui.logger.info(message);
    }

    warning(message: string): void {
        this.ui.logger.warning(message);
    }

    error(message: string): void {
        this.ui.logger.error(message);
    }

    debug(message: string): void {
        this.ui.logger.debug(message);
    }

    await(message: string): { start(): void; update(message: string): void; stop(): void } {
        const action = this.ui.logger.await(message);
        return {
            start: () => action.start(),
            update: (msg: string) => action.update(msg),
            stop: () => action.stop(),
        };
    }
}
