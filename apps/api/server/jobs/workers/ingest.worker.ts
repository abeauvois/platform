import type { PgBoss, Job } from '@platform/task';
import {
    QUEUE_NAMES,
    type IngestJobPayload,
    type IngestJobResult,
    type ProcessedItem,
} from '../types';
import { updateIngestJobStatus } from '../queries';
import {
    WorkflowBuilder,
    Bookmark,
    BaseContent,
    type ILogger,
} from '@platform/platform-domain';
import {
    ExtractStep,
    AnalyzeStep,
    EnrichStep,
    ExportStep,
    type ISourceReader,
    type SourceReaderConfig,
} from './workflow.steps';
import type { IngestRequest } from '../../validators/ingest.validator';
import { GmailApiClient } from '../../infrastructure/GmailApiClient';
import { InMemoryTimestampRepository } from '../../infrastructure/InMemoryTimestampRepository';

// Singleton timestamp repository to persist state across jobs
const gmailTimestampRepo = new InMemoryTimestampRepository('gmail');

/**
 * Create a Gmail source reader that fetches real Gmail messages
 */
function createGmailSourceReader(logger: ILogger): ISourceReader | undefined {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        logger.warning('Gmail credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN');
        return undefined;
    }

    const gmailClient = new GmailApiClient({
        clientId,
        clientSecret,
        refreshToken,
    });

    return {
        async ingest(config: SourceReaderConfig): Promise<BaseContent[]> {
            logger.info('Fetching Gmail messages...');

            // Calculate since timestamp
            let sinceDate: Date;
            const lastExecution = await gmailTimestampRepo.getLastExecutionTime();

            if (config.filter?.limitDays) {
                sinceDate = new Date(Date.now() - config.filter.limitDays * 24 * 60 * 60 * 1000);
            } else if (lastExecution) {
                sinceDate = lastExecution;
            } else {
                // Default: last 7 days for first run
                sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }

            logger.info(`Fetching messages since ${sinceDate.toISOString()}`);

            const messages = await gmailClient.fetchMessagesSince(
                sinceDate,
                config.filter?.email
            );

            logger.info(`Found ${messages.length} Gmail messages`);

            // Save current timestamp for next run
            await gmailTimestampRepo.saveLastExecutionTime(new Date());

            // Convert GmailMessage to BaseContent
            return messages.map(message => new BaseContent(
                message.rawContent || message.snippet,
                'Gmail',
                [],
                '',
                message.rawContent,
                message.receivedAt,
                message.receivedAt,
                'unknown'
            ));
        },
    };
}

/**
 * Factory to create source reader based on preset
 * Returns undefined if no specific source reader is configured for the preset
 */
function createSourceReader(
    preset: IngestRequest['preset'],
    logger: ILogger
): ISourceReader | undefined {
    switch (preset) {
        case 'gmail':
            return createGmailSourceReader(logger);

        case 'full':
        case 'quick':
        case 'analyzeOnly':
        case 'twitterFocus':
        case 'csvOnly':
        default:
            // These presets use the fallback sample data
            return undefined;
    }
}

/**
 * Create a logger for the job
 */
function createJobLogger(jobId: string): ILogger {
    const prefix = `[Job ${jobId}]`;
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
 * Convert Bookmark to ProcessedItem for API response
 */
function bookmarkToProcessedItem(bookmark: Bookmark, index: number): ProcessedItem {
    return {
        id: bookmark.id ?? `item-${index}`,
        url: bookmark.url,
        sourceAdapter: bookmark.sourceAdapter,
        tags: bookmark.tags,
        summary: bookmark.summary || undefined,
    };
}

/**
 * Process an ingest job using WorkflowBuilder
 */
async function processIngestJob(
    job: Job<IngestJobPayload>
): Promise<IngestJobResult> {
    const { taskId, userId, request } = job.data;
    const logger = createJobLogger(taskId);

    logger.info(`Starting ${request.preset} workflow for user ${userId}`);

    // Get source reader for the preset
    const sourceReader = createSourceReader(request.preset, logger);

    // Track the final result via onComplete hook
    let finalItems: Bookmark[] = [];
    let stepNames: string[] = [];

    // Build the workflow with conditional steps
    const workflow = new WorkflowBuilder<Bookmark>(logger)
        .addStep(new ExtractStep(request.preset, request.filter, logger, sourceReader))
        .when(!request.skipAnalysis, (b) => b.addStep(new AnalyzeStep(logger)))
        .when(!request.skipTwitter, (b) => b.addStep(new EnrichStep(logger)))
        .addStep(new ExportStep(request.csvOnly ?? false, logger))
        .onStart(async (info) => {
            stepNames = info.stepNames;
            await updateIngestJobStatus(taskId, {
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

            await updateIngestJobStatus(taskId, {
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
    const processedItems = finalItems.map((b, i) => bookmarkToProcessedItem(b, i));

    return {
        itemsProcessed: finalItems.length,
        itemsCreated: finalItems.length,
        errors: [],
        processedItems,
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
            for (const job of jobs) {
                const { taskId, userId } = job.data;
                console.log(`Processing ingest job ${taskId} for user ${userId}`);

                try {
                    const result = await processIngestJob(job);

                    // Update final status
                    await updateIngestJobStatus(taskId, {
                        status: 'completed',
                        progress: 100,
                        message: 'Workflow completed successfully',
                        result,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`Job ${taskId} failed:`, error);

                    // Update failed status
                    await updateIngestJobStatus(taskId, {
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
