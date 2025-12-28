import type { PgBoss } from '@platform/task';
import type { IIngestionTaskRepository } from '@platform/platform-domain';
import { registerIngestWorker } from './ingest.worker';

/**
 * Register all workers with pg-boss
 */
export async function registerAllWorkers(
    boss: PgBoss,
    taskRepository: IIngestionTaskRepository
): Promise<void> {
    await registerIngestWorker(boss, taskRepository);
    // Add more workers here as needed
}
