import type { WorkflowRequest } from '../validators/workflow.validator';

/**
 * Job queue names
 */
export const QUEUE_NAMES = {
    WORKFLOW: 'workflow',
    BOOKMARK_ENRICHMENT: 'bookmark-enrichment',
    SCRAPER: 'scraper',
} as const;

/**
 * Payload for workflow jobs
 */
export interface WorkflowJobPayload {
    taskId: string;
    userId: string;
    request: WorkflowRequest;
}

/**
 * Job status (compatible with existing API contract)
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Processed item returned by the workflow
 */
export interface ProcessedItem {
    id: string;
    url: string;
    sourceAdapter: string;
    tags: string[];
    summary?: string;
    rawContent?: string;
}

/**
 * Result stored after job completion
 */
export interface JobResult {
    itemsProcessed: number;
    itemsCreated: number;
    errors: string[];
    /** All processed items for display by outer apps */
    processedItems?: ProcessedItem[];
}

/**
 * Item progress within current step
 */
export interface ItemProgress {
    current: number;
    total: number;
}

/**
 * Job metadata stored in pg-boss output
 */
export interface JobOutput {
    status: JobStatus;
    progress: number;
    message: string;
    /** Current step being executed */
    currentStep?: string;
    /** Item progress within current step */
    itemProgress?: ItemProgress;
    result?: JobResult;
}
