import * as p from '@clack/prompts';
import type { ILogger } from '@abeauvois/platform-domain';

/**
 * Create a clack-based logger that uses spinners for progress
 * This logger is designed for CLI commands that use @clack/prompts
 */
export function createClackLogger(): ILogger {
    return {
        info: (message: string) => p.log.info(message),
        error: (message: string) => p.log.error(message),
        warning: (message: string) => p.log.warn(message),
        debug: () => { }, // Suppress debug logs in CLI
        await: (message: string) => {
            const spinner = p.spinner();
            return {
                start: () => spinner.start(message),
                update: (msg: string) => spinner.message(msg),
                stop: () => spinner.stop(message),
            };
        },
    };
}
