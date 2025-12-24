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
    jobId: string;
    userId: string;
    request: IngestRequest;
}

/**
 * Ingest job status (compatible with existing API contract)
 */
export type IngestJobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Result stored after job completion
 */
export interface IngestJobResult {
    itemsProcessed: number;
    itemsCreated: number;
    errors: string[];
}

/**
 * Job metadata stored in pg-boss output
 */
export interface IngestJobOutput {
    status: IngestJobStatus;
    progress: number;
    message: string;
    result?: IngestJobResult;
}
