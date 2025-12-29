import type { PgBoss, Job } from '@platform/task';
import {
    QUEUE_NAMES,
    type WorkflowJobPayload,
    type JobResult,
    type ProcessedItem,
} from '../types';
import {
    WorkflowBuilder,
    BaseContent,
    type ILogger,
    type IBackgroundTaskRepository,
} from '@platform/platform-domain';
import { getPreset } from './presets';

/**
 * Create a logger for the task
 */
function createTaskLogger(taskId: string): ILogger {
    const prefix = `[Task ${taskId}]`;
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
 * Convert BaseContent to ProcessedItem for API response
 */
function contentToProcessedItem(content: BaseContent, index: number): ProcessedItem {
    return {
        id: `item-${index}`,
        url: content.url,
        sourceAdapter: content.sourceAdapter,
        tags: content.tags,
        summary: content.summary || undefined,
        rawContent: content.rawContent || undefined,
    };
}

/**
 * Process a workflow task using WorkflowBuilder and preset configuration
 */
async function processWorkflowTask(
    job: Job<WorkflowJobPayload>,
    taskRepository: IBackgroundTaskRepository
): Promise<JobResult> {
    const { taskId, userId, request } = job.data;
    const logger = createTaskLogger(taskId);

    logger.info(`Starting ${request.preset} workflow for user ${userId}`);

    // Get preset configuration
    const preset = getPreset(request.preset);

    // Create source reader from preset
    const sourceReader = preset.createSourceReader(logger);

    // Log saveTo destination if specified
    if (request.saveTo) {
        logger.info(`Save destination: ${request.saveTo}`);
    }

    // Create workflow steps from preset
    const steps = preset.createSteps({
        logger,
        filter: request.filter,
        skipAnalysis: request.skipAnalysis,
        skipTwitter: request.skipTwitter,
        csvOnly: request.csvOnly,
        saveTo: request.saveTo,
        sourceReader,
    });

    // Track the final result via onComplete hook
    let finalItems: BaseContent[] = [];
    let stepNames: string[] = [];

    // Build the workflow with steps from preset
    const builder = new WorkflowBuilder<BaseContent>(logger);

    // Add all steps from preset
    for (const step of steps) {
        builder.addStep(step);
    }

    // Configure lifecycle hooks
    const workflow = builder
        .onStart(async (info) => {
            stepNames = info.stepNames;
            await taskRepository.updateStatus(taskId, {
                status: 'running',
                progress: 0,
                message: `Starting: ${info.stepNames.join(' → ')}`,
                currentStep: info.stepNames[0],
            });
        })
        .onItemProcessed(async (info) => {
            // Calculate progress
            const stepIndex = stepNames.indexOf(info.stepName);
            const stepProgress = (stepIndex / stepNames.length) * 100;
            const itemProgress = ((info.index + 1) / info.total) * (100 / stepNames.length);
            const totalProgress = Math.round(stepProgress + itemProgress);

            await taskRepository.updateStatus(taskId, {
                progress: Math.min(totalProgress, 99),
                message: `Running step: ${info.stepName}`,
                currentStep: info.stepName,
                itemProgress: { current: info.index + 1, total: info.total },
            });
        })
        .onError(async (info) => {
            logger.error(`Error in step ${info.stepName}: ${info.error.message}`);
            return { continue: true }; // Continue on error
        })
        .onComplete(async (completeInfo) => {
            finalItems = completeInfo.processedItems;
            logger.info(`Workflow completed: ${completeInfo.stats.itemsProcessed} items processed`);
        })
        .build();

    // Execute the workflow
    await workflow.execute('', '');

    // Convert to API response format
    const processedItems = finalItems.map((item, i) => contentToProcessedItem(item, i));

    return {
        itemsProcessed: finalItems.length,
        itemsCreated: finalItems.length,
        errors: [],
        processedItems,
    };
}

/**
 * Register the workflow worker with pg-boss
 */
export async function registerWorkflowWorker(
    boss: PgBoss,
    taskRepository: IBackgroundTaskRepository
): Promise<void> {
    await boss.work<WorkflowJobPayload>(
        QUEUE_NAMES.WORKFLOW,
        { batchSize: 1 },
        async (jobs) => {
            for (const job of jobs) {
                const { taskId, userId } = job.data;
                console.log(`Processing workflow task ${taskId} for user ${userId}`);

                try {
                    const result = await processWorkflowTask(job, taskRepository);

                    // Update final status
                    await taskRepository.updateStatus(taskId, {
                        status: 'completed',
                        progress: 100,
                        message: 'Workflow completed successfully',
                        result,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`Task ${taskId} failed:`, error);

                    // Update failed status
                    await taskRepository.updateStatus(taskId, {
                        status: 'failed',
                        message: errorMessage,
                    });

                    throw error;
                }
            }
        }
    );

    console.log(`Registered worker for ${QUEUE_NAMES.WORKFLOW}`);
}
