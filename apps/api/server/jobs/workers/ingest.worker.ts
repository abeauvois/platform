import { type PgBoss, type Job } from 'pg-boss';
import {
    QUEUE_NAMES,
    type IngestJobPayload,
    type IngestJobResult,
} from '../types';
import { updateIngestJobStatus } from '../queries';

/**
 * Process an ingest job with real-time status updates
 */
async function processIngestJob(
    job: Job<IngestJobPayload>
): Promise<IngestJobResult> {
    const { jobId, request } = job.data;

    // Update status to running
    await updateIngestJobStatus(jobId, {
        status: 'running',
        progress: 0,
        message: `Starting ${request.preset} workflow`,
    });

    const steps = ['extract', 'analyze', 'enrich', 'export'];
    const totalSteps = steps.length;
    let processedSteps = 0;

    for (let i = 0; i < totalSteps; i++) {
        const step = steps[i];

        // Skip steps based on options
        if (step === 'analyze' && request.skipAnalysis) continue;
        if (step === 'enrich' && request.skipTwitter) continue;

        processedSteps++;
        const progress = Math.round((processedSteps / totalSteps) * 100);

        await updateIngestJobStatus(jobId, {
            progress,
            message: `Running step: ${step}`,
        });

        // TODO: Integrate with actual WorkflowBuilder from src/application/workflows
        // For now, simulate step execution
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
        itemsProcessed: 0,
        itemsCreated: 0,
        errors: [],
    };
}

/**
 * Register the ingest worker with pg-boss
 */
export async function registerIngestWorker(boss: PgBoss): Promise<void> {
    await boss.work<IngestJobPayload>(
        QUEUE_NAMES.INGEST,
        { batchSize: 1 },
        async (jobs) => {
            // pg-boss v12 passes an array of jobs
            for (const job of jobs) {
                const { jobId, userId } = job.data;
                console.log(`Processing ingest job ${jobId} for user ${userId}`);

                try {
                    const result = await processIngestJob(job);

                    // Update final status
                    await updateIngestJobStatus(jobId, {
                        status: 'completed',
                        progress: 100,
                        message: 'Workflow completed successfully',
                        result,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`Job ${jobId} failed:`, error);

                    // Update failed status
                    await updateIngestJobStatus(jobId, {
                        status: 'failed',
                        message: errorMessage,
                    });

                    throw error;
                }
            }
        }
    );

    console.log(`Registered worker for ${QUEUE_NAMES.INGEST}`);
}
