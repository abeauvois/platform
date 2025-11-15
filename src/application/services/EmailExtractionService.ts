import { EmailLink } from '../../domain/entities/EmailLink.js';
import { ILinksExtractor } from '../../domain/ports/ILinksExtractor.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';
import { Pipeline, WorkflowExecutor } from '../../domain/workflow/index.js';
import { EmailFile } from '../../domain/entities/EmailFile.js';
import { ZipFileProducer } from '../../infrastructure/workflow/producers/ZipFileProducer.js';
import { EmailParserStage } from '../../infrastructure/workflow/stages/EmailParserStage.js';
import { EmailLinkCollector } from '../../infrastructure/workflow/consumers/EmailLinkCollector.js';

/**
 * Service responsible for extracting and parsing email files using workflow pipeline
 */
export class EmailExtractionService {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly linksExtractor: ILinksExtractor,
        private readonly logger: ILogger
    ) { }

    /**
     * Extract email files from zip and parse links from them
     * @param zipFilePath Path to the zip file or directory containing .eml files
     * @returns Array of EmailLink objects with extracted links
     */
    async extractAndParseEmails(zipFilePath: string): Promise<EmailLink[]> {
        // Create workflow components
        const producer = new ZipFileProducer(zipFilePath, this.zipExtractor);
        const pipeline = this.createPipeline();
        const consumer = new EmailLinkCollector(this.logger);

        // Create and execute workflow
        const workflow = new WorkflowExecutor<EmailFile, EmailLink>(
            producer,
            pipeline,
            consumer
        );

        // Execute with error handling
        await workflow.execute({
            onStart: async () => {
                this.logger.info('� Extracting .eml files from zip...');
            },
            onError: async (error: Error, item: EmailFile) => {
                this.logger.warning(`  ⚠️  ${item.filename}: ${error.message}`);
            },
            onComplete: async (stats) => {
                this.logger.info(`✅ Found ${stats.itemsProduced} email files`);
            }
        });

        // Return collected links
        return consumer.getEmailLinks();
    }

    /**
     * Create the pipeline for email processing
     * This can be customized or extended with additional stages
     */
    private createPipeline(): Pipeline<EmailFile, EmailLink> {
        const emailParserStage = new EmailParserStage(this.linksExtractor);
        return new Pipeline<EmailFile, EmailLink>(emailParserStage);
    }
}
