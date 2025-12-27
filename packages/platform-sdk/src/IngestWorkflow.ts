import type {
    WorkflowPreset,
    IngestOptions,
    WorkflowExecuteOptions,
    IIngestWorkflow,
    ILogger,
    ProcessedItem,
} from './types.js';

/**
 * API response when starting an ingest job
 */
interface IngestJobResponse {
    taskId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    message: string;
    preset: string;
    filter?: {
        email?: string;
    };
}

/**
 * API response when getting job status
 */
interface IngestJobStatus {
    taskId: string;
    preset: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message: string;
    createdAt: string;
    updatedAt: string;
    /** Current step being executed */
    currentStep?: string;
    /** Item progress within current step */
    itemProgress?: {
        current: number;
        total: number;
    };
    result?: {
        itemsProcessed: number;
        itemsCreated: number;
        errors: string[];
        /** All processed items for display by outer apps */
        processedItems?: ProcessedItem[];
    };
}

/**
 * Workflow configuration built from preset and options
 */
interface WorkflowConfig {
    preset: WorkflowPreset;
    options: IngestOptions;
    logger: ILogger;
    baseUrl: string;
    sessionToken?: string;
}

/**
 * IngestWorkflow - Executes data ingestion workflows via API
 *
 * This class encapsulates a workflow that can be executed with lifecycle hooks.
 * It's returned by PlatformApiClient.ingest() and provides a fluent API for
 * executing workflows with customizable event handlers.
 */
export class IngestWorkflow implements IIngestWorkflow {
    private readonly config: WorkflowConfig;
    private readonly pollIntervalMs = 500;
    private readonly maxPollAttempts = 120; // 60 seconds max wait

    constructor(config: WorkflowConfig) {
        this.config = config;
    }

    /**
     * Execute the workflow with optional lifecycle hooks
     *
     * @param options - Lifecycle hooks for workflow events
     * @returns Promise that resolves when workflow completes
     */
    async execute(options?: WorkflowExecuteOptions): Promise<void> {
        const { logger } = this.config;
        const hookInfo = { logger };
        const startTime = Date.now();

        try {
            // Call onStart hook
            if (options?.onStart) {
                await options.onStart(hookInfo);
            }

            // Execute the workflow via API with item progress callback
            const result = await this.runWorkflow(options?.onItemProcessed);

            // Call onComplete hook with all processed items
            if (options?.onComplete) {
                await options.onComplete({
                    logger,
                    stats: {
                        itemsProcessed: result.itemsProcessed,
                        itemsCreated: result.itemsCreated,
                        durationMs: Date.now() - startTime,
                        success: true,
                        errors: result.errors,
                    },
                    processedItems: result.processedItems,
                });
            }
        } catch (error) {
            // Call onError hook
            if (options?.onError) {
                await options.onError(hookInfo);
            }
            throw error;
        }
    }

    /**
     * Make an authenticated request to the API
     */
    private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const { baseUrl, sessionToken } = this.config;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (sessionToken) {
            headers['Cookie'] = `better-auth.session_token=${sessionToken}`;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        return await response.json() as T;
    }

    /**
     * Start the ingest job via API
     */
    private async startJob(): Promise<IngestJobResponse> {
        const { preset, options, logger } = this.config;

        logger.info(`Starting ${preset} workflow via API`);

        const body = {
            preset,
            filter: options.filter,
            skipAnalysis: options.skipAnalysis,
            skipTwitter: options.skipTwitter,
            csvOnly: options.csvOnly,
        };

        return this.apiRequest<IngestJobResponse>('/api/ingest', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /**
     * Poll for job status until completion
     */
    private async pollJobStatus(
        jobId: string,
        onItemProcessed?: (info: import('./types.js').ItemProcessedInfo) => void | Promise<void>
    ): Promise<IngestJobStatus> {
        const { logger } = this.config;
        let attempts = 0;
        let lastMessage = '';
        let lastItemIndex = -1;

        // Use spinner for progress updates
        const spinner = logger.await(`Processing...`);
        spinner.start();

        try {
            while (attempts < this.maxPollAttempts) {
                const status = await this.apiRequest<IngestJobStatus>(`/api/ingest/${jobId}`);
                logger.debug(status.itemProgress ?
                    `Job ${jobId} status: ${status.status}, step: ${status.currentStep}, item progress: ${status.itemProgress.current}/${status.itemProgress.total}` :
                    `Job ${jobId} status: ${status.status}, step: ${status.currentStep}`);

                if (status.status === 'completed') {
                    spinner.stop();
                    return status;
                }

                if (status.status === 'failed') {
                    spinner.stop();
                    throw new Error(`Job ${jobId} failed: ${status.message}`);
                }

                // Call onItemProcessed hook if item progress changed
                if (onItemProcessed && status.itemProgress && status.currentStep) {
                    const currentIndex = status.itemProgress.current - 1;
                    if (currentIndex > lastItemIndex) {
                        lastItemIndex = currentIndex;
                        await onItemProcessed({
                            index: currentIndex,
                            total: status.itemProgress.total,
                            stepName: status.currentStep,
                            success: true,
                        });
                    }
                }

                // Update spinner with progress
                if (status.status === 'running' && status.message !== lastMessage) {
                    lastMessage = status.message;
                    spinner.update(`${status.message} (${status.progress}%)`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
                attempts++;
            }

            spinner.stop();
            throw new Error(`Job ${jobId} timed out after ${this.maxPollAttempts * this.pollIntervalMs / 1000} seconds`);
        } catch (error) {
            spinner.stop();
            throw error;
        }
    }

    /**
     * Internal method to run the actual workflow via API
     */
    private async runWorkflow(
        onItemProcessed?: (info: import('./types.js').ItemProcessedInfo) => void | Promise<void>
    ): Promise<{ itemsProcessed: number; itemsCreated: number; errors: string[]; processedItems: ProcessedItem[] }> {
        const { preset, options, logger } = this.config;

        // Log configuration
        if (options.filter?.email) {
            logger.info(`Filtering by email: ${options.filter.email}`);
        }
        if (options.skipAnalysis) {
            logger.info('Skipping analysis step');
        }
        if (options.skipTwitter) {
            logger.info('Skipping Twitter enrichment');
        }

        // Start the job
        const jobResponse = await this.startJob();
        logger.info(`Job started: ${jobResponse.taskId}`);

        // Poll for completion with item progress callback
        const finalStatus = await this.pollJobStatus(jobResponse.taskId, onItemProcessed);

        // Log results
        const result = finalStatus.result ?? { itemsProcessed: 0, itemsCreated: 0, errors: [], processedItems: [] };
        logger.info(`Processed ${result.itemsProcessed} items, createdx ${result.itemsCreated}`);
        if (result.errors.length > 0) {
            logger.warning(`Encountered ${result.errors.length} errors`);
        }

        logger.info(`Workflow ${preset} completed`);

        return {
            itemsProcessed: result.itemsProcessed,
            itemsCreated: result.itemsCreated,
            errors: result.errors,
            processedItems: result.processedItems ?? [],
        };
    }
}
