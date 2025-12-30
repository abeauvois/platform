import type { PgBoss, Job } from '@platform/task';
import { QUEUE_NAMES } from '../types';
import {
    WorkflowBuilder,
    BaseContent,
    type ILogger,
} from '@platform/platform-domain';
import { getPreset } from './presets';

/**
 * Payload for scheduled enrichment jobs
 * These are created by pg-boss schedule, not user requests
 */
export interface EnrichmentJobPayload {
    preset: 'bookmarkEnrichment';
}

/**
 * Create a logger for the enrichment task
 */
function createEnrichmentLogger(): ILogger {
    const prefix = `[Enrichment ${new Date().toISOString()}]`;
    return {
        info: (message: string) => console.log(`${prefix} INFO: ${message}`),
        warning: (message: string) => console.warn(`${prefix} WARN: ${message}`),
        error: (message: string) => console.error(`${prefix} ERROR: ${message}`),
        debug: (message: string) => console.debug(`${prefix} DEBUG: ${message}`),
        await: (message: string) => ({
            start: () => console.log(`${prefix} LOADING: ${message}`),
            update: (msg: string) => console.log(`${prefix} LOADING: ${msg}`),
            stop: () => console.log(`${prefix} DONE`),
        }),
    };
}

/**
 * Process the scheduled enrichment task
 * This runs daily and processes all pending content
 */
async function processEnrichmentTask(
    job: Job<EnrichmentJobPayload>
): Promise<void> {
    const logger = createEnrichmentLogger();

    logger.info('Starting scheduled bookmark enrichment');

    // Get the bookmarkEnrichment preset
    const preset = getPreset('bookmarkEnrichment');

    // Create source reader (fetches pending content from DB)
    const sourceReader = preset.createSourceReader(logger);

    if (!sourceReader) {
        logger.error('Failed to create source reader for enrichment');
        return;
    }

    // Create workflow steps
    const steps = preset.createSteps({
        userId: '', // No specific userId for scheduled enrichment
        logger,
        preset: job.data.preset,
        sourceReader,
    });

    if (steps.length === 0) {
        logger.error('No steps configured for enrichment workflow');
        return;
    }

    // Build the workflow
    const builder = new WorkflowBuilder<BaseContent>(logger);

    for (const step of steps) {
        builder.addStep(step);
    }

    const workflow = builder
        .onStart(async (info) => {
            logger.info(`Enrichment workflow started: ${info.stepNames.join(' → ')}`);
        })
        .onItemProcessed(async (info) => {
            logger.info(`Processed item ${info.index + 1}/${info.total} in step ${info.stepName}`);
        })
        .onError(async (info) => {
            logger.error(`Error in step ${info.stepName}: ${info.error.message}`);
            return { continue: true }; // Continue on error
        })
        .onComplete(async (completeInfo) => {
            logger.info(
                `Enrichment completed: ${completeInfo.stats.itemsProcessed} items processed`
            );
        })
        .build();

    // Execute the workflow
    await workflow.execute('', '', '');

    logger.info('Scheduled bookmark enrichment completed');
}

/**
 * Register the enrichment worker with pg-boss
 * This handles scheduled enrichment jobs from the daily cron
 */
export async function registerEnrichmentWorker(boss: PgBoss): Promise<void> {
    await boss.work<EnrichmentJobPayload>(
        QUEUE_NAMES.BOOKMARK_ENRICHMENT,
        { batchSize: 1 },
        async (jobs) => {
            for (const job of jobs) {
                console.log('Processing scheduled enrichment job');

                try {
                    await processEnrichmentTask(job);
                } catch (error) {
                    console.error('Enrichment job failed:', error);
                    throw error;
                }
            }
        }
    );

    console.log(`Registered worker for ${QUEUE_NAMES.BOOKMARK_ENRICHMENT}`);
}
