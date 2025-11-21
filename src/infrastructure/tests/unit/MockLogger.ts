import { ILogger } from '../../../domain/ports/ILogger';

export class MockLogger implements ILogger {
    logs: string[] = [];

    info(message: string, options?: { prefix?: string; suffix?: string; }): void {
        this.logs.push(`INFO: ${message}`);
    }

    error(message: string, options?: { prefix?: string; suffix?: string; }): void {
        this.logs.push(`ERROR: ${message}`);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string; }): void {
        this.logs.push(`WARNING: ${message}`);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string; }): void {
        this.logs.push(`DEBUG: ${message}`);
    }

    await(message: string, options?: { prefix?: string; suffix?: string; }) {
        return {
            start: () => { },
            update: (msg: string) => { },
            stop: () => { },
        };
    }
}
