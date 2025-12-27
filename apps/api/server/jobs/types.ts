import type { IngestRequest } from '../validators/ingest.validator';

/**
 * Job queue names
 */
export const QUEUE_NAMES = {
    INGEST: 'ingest-workflow',
} as const;

/**
 * Payload for ingest jobs
 */
export interface IngestJobPayload {
    taskId: string;
    userId: string;
    request: IngestRequest;
}

/**
 * Ingest job status (compatible with existing API contract)
 */
export type IngestJobStatus = 'pending' | 'running' | 'completed' | 'failed';

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
export interface IngestJobResult {
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
export interface IngestJobOutput {
    status: IngestJobStatus;
    progress: number;
    message: string;
    /** Current step being executed */
    currentStep?: string;
    /** Item progress within current step */
    itemProgress?: ItemProgress;
    result?: IngestJobResult;
}
