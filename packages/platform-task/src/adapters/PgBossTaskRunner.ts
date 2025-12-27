import type { PgBoss } from 'pg-boss';
import type { IBackgroundTaskRunner, BackgroundTaskOptions } from '../ports.js';

export class PgBossTaskRunner implements IBackgroundTaskRunner {
    constructor(private readonly boss: PgBoss) {}

    async submit<T extends object>(taskType: string, payload: T, options?: BackgroundTaskOptions): Promise<string | null> {
        if (options) {
            return await this.boss.send(taskType, payload, options);
        }
        return await this.boss.send(taskType, payload);
    }
}
