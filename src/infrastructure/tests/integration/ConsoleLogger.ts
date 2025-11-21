import { ILogger } from '../../../domain/ports/ILogger';

// Simple console logger for integration tests
export class ConsoleLogger implements ILogger {
    info(message: string, options?: { prefix?: string; suffix?: string; }): void {
        console.log(`[INFO] ${message}`);
    }

    error(message: string, options?: { prefix?: string; suffix?: string; }): void {
        console.error(`[ERROR] ${message}`);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string; }): void {
        console.warn(`[WARNING] ${message}`);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string; }): void {
        console.debug(`[DEBUG] ${message}`);
    }

    await(message: string, options?: { prefix?: string; suffix?: string; }) {
        return {
            start: () => {
                console.log(`[LOADING] ${message}`);
            },
            update: (msg: string) => {
                console.log(`[UPDATE] ${msg}`);
            },
            stop: () => {
                console.log(`[DONE]`);
            },
        };
    }
}
