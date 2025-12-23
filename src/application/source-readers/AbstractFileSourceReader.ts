import { AbstractSourceReader } from './AbstractSourceReader.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { FileIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Base class for file-based source readers
 * Examples: Zip files, directories, PDFs, etc.
 *
 * These sources typically:
 * - Work with file system paths
 * - Require parsing and extraction
 * - May process multiple files at once
 * - Support recursive directory scanning
 */
export abstract class AbstractFileSourceReader<TRaw, TNormalized extends BaseContent> extends AbstractSourceReader<TRaw, TNormalized> {
    constructor(
        sourceType: SourceAdapter,
        logger: ILogger
    ) {
        super(sourceType, logger);
    }

    /**
     * Validate file configuration
     * Ensures required path is present
     */
    protected async validateConfig(config: IngestionConfig): Promise<void> {
        const fileConfig = config as FileIngestionConfig;

        if (!fileConfig.path) {
            throw new Error(`${this.sourceType}: path is required for file source readers`);
        }

        await this.validateFileConfig(fileConfig);
    }

    /**
     * Subclass-specific file configuration validation
     * Override to add custom validation logic (e.g., check file exists)
     */
    protected async validateFileConfig(config: FileIngestionConfig): Promise<void> {
        // Default implementation: no additional validation
    }

    /**
     * Fetch raw data from files
     * Delegates to subclass implementation
     */
    protected abstract fetchRaw(config: IngestionConfig): Promise<TRaw[]>;
}
