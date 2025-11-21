import { UnstructuredDataSource } from '../../domain/entities/UnstructuredDataSource.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { EmailFile } from '../../domain/entities/EmailFile.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { FileIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Zip File Data Source
 * Extracts and normalizes email files from zip archives into BaseContent
 */
export class ZipFileDataSource extends UnstructuredDataSource<EmailFile, BaseContent> {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        logger: ILogger
    ) {
        super('ZipFile', logger);
    }

    /**
     * Fetch email files from zip archive
     */
    protected async fetchRaw(config: IngestionConfig): Promise<EmailFile[]> {
        const fileConfig = config as FileIngestionConfig;

        // Extract files from zip
        const filesMap = await this.zipExtractor.extractFiles(fileConfig.path);

        // Convert Map to EmailFile array
        const emailFiles: EmailFile[] = [];
        for (const [filename, content] of filesMap.entries()) {
            emailFiles.push({
                filename,
                content,
            });
        }

        return emailFiles;
    }

    /**
     * Normalize email files to BaseContent
     */
    protected async normalize(emailFiles: EmailFile[]): Promise<BaseContent[]> {
        const now = new Date();

        return emailFiles.map(file => new BaseContent(
            file.content,              // url field - contains the raw content
            'ZipFile',                 // source adapter
            [],                        // tags - empty initially
            '',                        // summary - empty initially
            file.content,              // raw content
            now,                       // created at
            now                        // updated at
        ));
    }
}
