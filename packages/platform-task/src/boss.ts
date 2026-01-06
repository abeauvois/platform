import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

export interface BossConfig {
    connectionString: string;
    schema?: string;
}

/**
 * Initialize and start pg-boss
 * Call this during server startup
 */
export async function initBoss(config: BossConfig): Promise<PgBoss> {
    if (boss) {
        return boss;
    }

    boss = new PgBoss({
        connectionString: config.connectionString,
        schema: config.schema ?? 'pgboss',
        migrate: true,
    });

    boss.on('error', (error: Error) => {
        console.error('pg-boss error:', error);
    });

    await boss.start();

    return boss;
}

/**
 * Get the pg-boss instance
 * Throws if not initialized
 */
export function getBoss(): PgBoss {
    if (!boss) {
        throw new Error('pg-boss not initialized. Call initBoss() first.');
    }
    return boss;
}

/**
 * Gracefully stop pg-boss
 * Call during server shutdown
 */
export async function stopBoss(): Promise<void> {
    if (boss) {
        await boss.stop({ graceful: true });
        boss = null;
    }
}

/**
 * Create a queue (required in pg-boss v10+)
 */
export async function createQueue(queueName: string): Promise<void> {
    const b = getBoss();
    await b.createQueue(queueName);
}

/**
 * Schedule a recurring task using a cron expression
 *
 * In pg-boss v10+, the schedule name is used as the queue name.
 * The worker must listen on the same queue name (e.g., 'daily-bookmark-enrichment').
 *
 * @param name Unique name for this schedule (also the queue name)
 * @param cronExpression Cron expression (e.g., '59 11 * * *' for 11:59 AM daily)
 * @param queueName The queue to send jobs to (will be used as the schedule name)
 * @param data Optional data payload to include with each job
 * @param options Optional scheduling options
 *
 * @example
 * // Schedule daily at 11:59 AM UTC
 * await scheduleRecurringTask(
 *   'daily-enrichment',
 *   '59 11 * * *',
 *   'bookmark-enrichment',
 *   { preset: 'bookmarkEnrichment' }
 * );
 */
export async function scheduleRecurringTask<T extends object>(
    _name: string,
    cronExpression: string,
    queueName: string,
    data?: T,
    options?: { tz?: string }
): Promise<void> {
    const b = getBoss();
    // pg-boss v10+ schedule sends jobs to the queue with the same name as the schedule
    // We use queueName as the actual schedule name so jobs go to the correct queue
    await b.schedule(queueName, cronExpression, data ?? {}, {
        tz: options?.tz ?? 'UTC',
    });
}
