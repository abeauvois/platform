import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';
import { ICsvParser } from '../../domain/ports/ICsvParser.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { Pipeline, WorkflowExecutor, WorkflowOptions } from '../../domain/workflow/index.js';
import { DirectorySourceReader } from '../source-readers/DirectorySourceReader.js';
import { CsvFromZipProducer } from '../../infrastructure/workflow/producers/CsvFromZipProducer.js';
import { BaseContentCollector } from '../../infrastructure/workflow/consumers/BaseContentCollector.js';
import { BaseContentDeduplicationStage } from '../../infrastructure/workflow/stages/BaseContentDeduplicationStage.js';

/**
 * Service responsible for extracting and parsing CSV files from zip archives or directories
 * Uses WorkflowExecutor pattern for consistent error handling and statistics
 */
export class CsvFromZipBookmarksWorkflowService {
    constructor(
        private readonly directoryReader: IDirectoryReader,
        private readonly csvParser: ICsvParser,
        private readonly logger: ILogger,
        private readonly enableDeduplication: boolean = false
    ) { }

    /**
     * Extract CSV files from zip and parse into BaseContent items
     * @param sourcePath Path to the zip file containing CSV files
     * @param options Optional workflow execution options
     * @returns Array of BaseContent objects with parsed CSV data
     */
    async extractAndParseCsv(
        sourcePath: string,
        options?: Partial<WorkflowOptions<BaseContent>>
    ): Promise<BaseContent[]> {
        const sourceReader = new DirectorySourceReader(this.directoryReader, this.logger);

        // Create producer that combines extraction + CSV parsing
        const producer = new CsvFromZipProducer(
            sourceReader,
            this.csvParser,
            { path: sourcePath }
        );

        // Create pipeline with optional deduplication
        const pipeline = new Pipeline<BaseContent, BaseContent>();
        if (this.enableDeduplication) {
            pipeline.addStage(new BaseContentDeduplicationStage());
        }

        // Create consumer to collect results
        const consumer = new BaseContentCollector(this.logger);

        // Create and execute workflow
        const workflow = new WorkflowExecutor<BaseContent, BaseContent>(
            producer,
            pipeline,
            consumer
        );

        // Execute with default and custom options
        await workflow.execute({
            onStart: async () => {
                this.logger.info('📦 Extracting CSV from zip...');
            },
            onError: async (error: Error, item: BaseContent) => {
                this.logger.warning(`  ⚠️  Failed to process item: ${error.message}`);
            },
            onComplete: async (stats) => {
                this.logger.info(
                    `✅ Processed ${stats.itemsProduced} CSV rows → ${stats.itemsConsumed} items collected`
                );
            },
            ...options, // Merge custom options
        });

        // Return collected items
        return consumer.getItems();
    }
}
