import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ILinksExtractor } from '../../domain/ports/ILinksExtractor.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';
import { Pipeline, WorkflowExecutor } from '../../domain/workflow/index.js';
import { EmailFile } from '../../domain/entities/EmailFile.js';
import { IProducer } from '../../domain/workflow/IProducer.js';
import { ZipFileEmailFileProducer } from '../../infrastructure/workflow/producers/ZipFileEmailFileProducer';
import { SingleFolderEmailFileProducer } from '../../infrastructure/workflow/producers/SingleFolderEmailFileProducer';
import { BookmarkCollector } from '../../infrastructure/workflow/consumers/BookmarkCollector.js';
import { statSync } from 'fs';
import { EmlContentAnalyserStage } from '../../infrastructure/workflow/stages/EmlContentAnalyserStage .js';
import { IContentAnalyser } from '../../domain/ports/IContentAnalyser.js';

/**
 * Service responsible for extracting and parsing email files using workflow pipeline
 */
export class ZipEmlFilesBookmarksWorkflowService {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly anthropicClient: IContentAnalyser,
        private readonly logger: ILogger
    ) { }

    /**
     * Extract email files from zip and parse links from them
     * @param sourcePath Path to the zip file or directory containing .eml files
     * @returns Array of Bookmark objects with extracted links
     */
    async extractAndParseEmails(sourcePath: string): Promise<Bookmark[]> {

        const producer = this.createProducer(sourcePath);
        const stage = new EmlContentAnalyserStage(this.anthropicClient);
        const pipeline = new Pipeline().addStage(stage);
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
                this.logger.info('📦 Reading .eml files...');
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
                return new SingleFolderEmailFileProducer(sourcePath);
            } else if (stats.isFile()) {
                this.logger.debug(`Source is a file: ${sourcePath}`);
                return new ZipFileEmailFileProducer(sourcePath, this.zipExtractor);
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

}
