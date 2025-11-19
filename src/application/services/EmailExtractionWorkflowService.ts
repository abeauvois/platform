import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ILinksExtractor } from '../../domain/ports/ILinksExtractor.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';
import { Pipeline, WorkflowExecutor } from '../../domain/workflow/index.js';
import { EmailFile } from '../../domain/entities/EmailFile.js';
import { IProducer } from '../../domain/workflow/IProducer.js';
import { ZipFileProducer } from '../../infrastructure/workflow/producers/ZipFileProducer.js';
import { SingleFolderProducer } from '../../infrastructure/workflow/producers/SingleFolderProducer.js';
import { EmailParserStage } from '../../infrastructure/workflow/stages/EmailParserStage.js';
import { BookmarkCollector } from '../../infrastructure/workflow/consumers/BookmarkCollector.js';
import { statSync } from 'fs';

/**
 * Service responsible for extracting and parsing email files using workflow pipeline
 */
export class EmailExtractionWorkflowService {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly linksExtractor: ILinksExtractor,
        private readonly logger: ILogger
    ) { }

    /**
     * Extract email files from zip and parse links from them
     * @param sourcePath Path to the zip file or directory containing .eml files
     * @returns Array of Bookmark objects with extracted links
     */
    async extractAndParseEmails(sourcePath: string): Promise<Bookmark[]> {
        // Determine source type and create appropriate producer
        const producer = this.createProducer(sourcePath);
        const pipeline = this.createPipeline();
        const consumer = new BookmarkCollector(this.logger);

        // Create and execute workflow
        const workflow = new WorkflowExecutor<EmailFile, Bookmark>(
            producer,
            pipeline,
            consumer
        );

        // Execute with error handling
        await workflow.execute({
            onStart: async () => {
                this.logger.info('📦 Extracting .eml files...');
            },
            onError: async (error: Error, item: EmailFile) => {
                this.logger.warning(`  ⚠️  ${item.filename}: ${error.message}`);
            },
            onComplete: async (stats) => {
                this.logger.info(`✅ Found ${stats.itemsProduced} email files`);
            }
        });

        // Return collected links
        return consumer.getBookmarks();
    }

    /**
     * Create appropriate producer based on source path type
     * @param sourcePath Path to zip file or directory
     * @returns Producer for the source type
     */
    private createProducer(sourcePath: string): IProducer<EmailFile> {
        try {
            const stats = statSync(sourcePath);

            if (stats.isDirectory()) {
                this.logger.debug(`Source is a directory: ${sourcePath}`);
                return new SingleFolderProducer(sourcePath);
            } else if (stats.isFile()) {
                this.logger.debug(`Source is a file: ${sourcePath}`);
                return new ZipFileProducer(sourcePath, this.zipExtractor);
            } else {
                throw new Error(`Source path is neither a file nor a directory: ${sourcePath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Source path not found: ${sourcePath}`);
            }
            throw error;
        }
    }

    /**
     * Create the pipeline for email processing
     * This can be customized or extended with additional stages
     */
    private createPipeline(): Pipeline<EmailFile, Bookmark> {
        const emailParserStage = new EmailParserStage(this.linksExtractor);
        return new Pipeline<EmailFile, Bookmark>(emailParserStage);
    }
}
