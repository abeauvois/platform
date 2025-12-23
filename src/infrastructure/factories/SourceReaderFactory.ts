import { AbstractSourceReader } from '../../application/source-readers/AbstractSourceReader.js';
import { GmailSourceReader } from '../../application/source-readers/GmailSourceReader.js';
import { DirectorySourceReader } from '../../application/source-readers/DirectorySourceReader.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IEmailClient } from '../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';

/**
 * Dependencies that may be needed by different source readers
 */
export interface SourceReaderDependencies {
    emailClient?: IEmailClient;
    timestampRepository?: ITimestampRepository;
    directoryReader?: IDirectoryReader;
}

/**
 * Factory for creating source reader instances based on SourceAdapter type
 *
 * This factory pattern provides:
 * - Centralized creation logic for source readers
 * - Type-safe instantiation based on SourceAdapter
 * - Dependency injection for different implementations
 * - Easy extensibility for new source types
 *
 * @example
 * ```typescript
 * const sourceReader = SourceReaderFactory.create(
 *   'Gmail',
 *   logger,
 *   { emailClient, timestampRepository }
 * );
 * ```
 */
export class SourceReaderFactory {
    /**
     * Creates a source reader instance for the specified source adapter type
     *
     * @param source - The type of source reader to create
     * @param logger - Logger instance for logging
     * @param dependencies - Required dependencies for the specific source reader type
     * @returns An instance of the appropriate source reader
     * @throws Error if the source type is unsupported or dependencies are missing
     */
    static create(
        source: SourceAdapter,
        logger: ILogger,
        dependencies: SourceReaderDependencies
    ): AbstractSourceReader<any, BaseContent> {
        switch (source) {
            case 'Gmail':
                return SourceReaderFactory.createGmailSourceReader(logger, dependencies);

            case 'ZipFile':
            case 'Directory':
                return SourceReaderFactory.createDirectorySourceReader(logger, dependencies);

            case 'None':
                throw new Error('Cannot create source reader for None type');

            case 'Outlook':
            case 'EmlFile':
            case 'NotionDatabase':
            case 'Other':
                throw new Error(`Unsupported source adapter: ${source}`);

            default:
                // TypeScript will ensure this is never reached if all cases are handled
                const exhaustiveCheck: never = source;
                throw new Error(`Unhandled source adapter: ${exhaustiveCheck}`);
        }
    }

    /**
     * Creates a Gmail source reader
     */
    private static createGmailSourceReader(
        logger: ILogger,
        dependencies: SourceReaderDependencies
    ): GmailSourceReader {
        const { emailClient, timestampRepository } = dependencies;

        if (!emailClient || !timestampRepository) {
            throw new Error('Gmail source reader requires emailClient and timestampRepository');
        }

        return new GmailSourceReader(emailClient, timestampRepository, logger);
    }

    /**
     * Creates a Directory source reader (also handles ZipFile sources)
     */
    private static createDirectorySourceReader(
        logger: ILogger,
        dependencies: SourceReaderDependencies
    ): DirectorySourceReader {
        const { directoryReader } = dependencies;

        if (!directoryReader) {
            throw new Error('Directory source reader requires directoryReader');
        }

        return new DirectorySourceReader(directoryReader, logger);
    }
}
