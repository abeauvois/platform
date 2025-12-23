import { BaseContent } from '../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Abstract base class for all source readers
 * Uses Template Method pattern to define the ingestion workflow
 *
 * Source readers orchestrate: fetch → normalize → enrich
 * They are application-level services, not infrastructure adapters.
 *
 * @template TRaw - The raw data type from the source (e.g., GmailMessage, RawFile)
 * @template TNormalized - The normalized content type (extends BaseContent)
 */
export abstract class AbstractSourceReader<TRaw, TNormalized extends BaseContent> {
    constructor(
        protected readonly sourceType: SourceAdapter,
        protected readonly logger: ILogger
    ) { }

    /**
     * Main ingestion workflow (Template Method)
     * Defines the steps: validate → fetch → normalize → enrich
     */
    async ingest(config: IngestionConfig): Promise<TNormalized[]> {
        await this.validateConfig(config);

        this.logger.info(`📥 Fetching data from ${this.sourceType}...`);
        const rawData = await this.fetchRaw(config);

        this.logger.info(`🔄 Normalizing ${rawData.length} items...`);
        const normalized = await this.normalize(rawData);

        this.logger.info(`✨ Enriching ${normalized.length} items...`);
        const enriched = await this.enrich(normalized);

        this.logger.info(`✅ Ingestion complete: ${enriched.length} items`);
        return enriched;
    }

    /**
     * Validate the configuration before ingestion
     * Subclasses should implement validation logic
     */
    protected abstract validateConfig(config: IngestionConfig): Promise<void>;

    /**
     * Fetch raw data from the source
     * Subclasses must implement the actual fetching logic
     */
    protected abstract fetchRaw(config: IngestionConfig): Promise<TRaw[]>;

    /**
     * Normalize raw data to BaseContent or its subclass
     * Subclasses must implement the transformation logic
     */
    protected abstract normalize(raw: TRaw[]): Promise<TNormalized[]>;

    /**
     * Optional enrichment step (hook method)
     * Default implementation returns items as-is
     * Subclasses can override to add enrichment logic
     */
    protected async enrich(items: TNormalized[]): Promise<TNormalized[]> {
        return items;
    }

    /**
     * Get the source type
     */
    getSourceType(): SourceAdapter {
        return this.sourceType;
    }
}
