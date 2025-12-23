import { AbstractSourceReader } from './AbstractSourceReader.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { ApiIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Base class for API-based source readers
 * Examples: Gmail, Twitter, Notion, etc.
 *
 * These sources typically:
 * - Require authentication
 * - Have pagination
 * - Return structured data with known schemas
 * - Support filtering and querying
 */
export abstract class AbstractApiSourceReader<TRaw, TNormalized extends BaseContent> extends AbstractSourceReader<TRaw, TNormalized> {
    constructor(
        sourceType: SourceAdapter,
        logger: ILogger
    ) {
        super(sourceType, logger);
    }

    /**
     * Validate API configuration
     * Ensures required credentials are present
     */
    protected async validateConfig(config: IngestionConfig): Promise<void> {
        const apiConfig = config as ApiIngestionConfig;

        if (!apiConfig.credentials) {
            throw new Error(`${this.sourceType}: credentials are required for API source readers`);
        }

        await this.validateApiConfig(apiConfig);
    }

    /**
     * Subclass-specific API configuration validation
     * Override to add custom validation logic
     */
    protected async validateApiConfig(config: ApiIngestionConfig): Promise<void> {
        // Default implementation: no additional validation
    }

    /**
     * Fetch raw data from the API
     * Delegates to subclass implementation
     */
    protected abstract fetchRaw(config: IngestionConfig): Promise<TRaw[]>;
}
