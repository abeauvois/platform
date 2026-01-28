import type { BaseContent } from '../entities/BaseContent.js';

/**
 * Configuration for reading content from a source
 */
export interface SourceReaderConfig {
    userId?: string;
    filter?: {
        email?: string;
        limitDays?: number;
        withUrl?: boolean;
    };
}

/**
 * Port: Interface for reading content from various sources (Gmail, files, etc.)
 *
 * The responsibility of a SourceReader is to READ data from a source
 * and return normalized BaseContent items. It does NOT handle the full
 * ingestion workflow (analysis, enrichment, export) - that's the worker's job.
 */
export interface ISourceReader {
    read(config: SourceReaderConfig): Promise<Array<BaseContent>>;
}
