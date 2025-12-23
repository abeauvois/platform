import type {
    WorkflowPreset,
    IngestOptions,
    WorkflowExecuteOptions,
    IIngestWorkflow,
    ILogger,
} from './types.js';

/**
 * API response when starting an ingest job
 */
interface IngestJobResponse {
    jobId: string;
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
    jobId: string;
    preset: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message: string;
    createdAt: string;
    updatedAt: string;
    result?: {
        itemsProcessed: number;
        itemsCreated: number;
        errors: string[];
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
    private pollIntervalMs = 500;
    private maxPollAttempts = 120; // 60 seconds max wait

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

        try {
            // Call onStart hook
            if (options?.onStart) {
                await options.onStart(hookInfo);
            }

            // Execute the workflow via API
            await this.runWorkflow();

            // Call onComplete hook
            if (options?.onComplete) {
                await options.onComplete(hookInfo);
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
    private async pollJobStatus(jobId: string): Promise<IngestJobStatus> {
        const { logger } = this.config;
        let attempts = 0;

        while (attempts < this.maxPollAttempts) {
            const status = await this.apiRequest<IngestJobStatus>(`/api/ingest/${jobId}`);

            if (status.status === 'completed') {
                logger.info(`Job ${jobId} completed: ${status.message}`);
                return status;
            }

            if (status.status === 'failed') {
                throw new Error(`Job ${jobId} failed: ${status.message}`);
            }

            // Log progress updates
            if (status.status === 'running') {
                logger.debug(`Job ${jobId} progress: ${status.progress}% - ${status.message}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
            attempts++;
        }

        throw new Error(`Job ${jobId} timed out after ${this.maxPollAttempts * this.pollIntervalMs / 1000} seconds`);
    }

    /**
     * Internal method to run the actual workflow via API
     */
    private async runWorkflow(): Promise<void> {
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
        logger.info(`Job started: ${jobResponse.jobId}`);

        // Poll for completion
        const finalStatus = await this.pollJobStatus(jobResponse.jobId);

        // Log results
        if (finalStatus.result) {
            logger.info(`Processed ${finalStatus.result.itemsProcessed} items, created ${finalStatus.result.itemsCreated}`);
            if (finalStatus.result.errors.length > 0) {
                logger.warning(`Encountered ${finalStatus.result.errors.length} errors`);
            }
        }

        logger.info(`Workflow ${preset} completed`);
    }
}
