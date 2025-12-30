import type { PgBoss } from '@platform/task';
import type { IBackgroundTaskRepository } from '@platform/platform-domain';
import { registerWorkflowWorker } from './workflow.worker';
import { registerEnrichmentWorker } from './enrichment.worker';

/**
 * Register all workers with pg-boss
 */
export async function registerAllWorkers(
    boss: PgBoss,
    taskRepository: IBackgroundTaskRepository
): Promise<void> {
    await registerWorkflowWorker(boss, taskRepository);
    await registerEnrichmentWorker(boss);
}
