import { UnstructuredDataSource } from '../../domain/entities/UnstructuredDataSource.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { EmailFile } from '../../domain/entities/EmailFile.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { FileIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Directory Data Source
 * Reads and normalizes files from a directory into BaseContent
 * Supports recursive scanning and file pattern filtering
 */
export class DirectoryDataSource extends UnstructuredDataSource<EmailFile, BaseContent> {
    constructor(
        private readonly directoryReader: IDirectoryReader,
        logger: ILogger
    ) {
        super(SourceAdapter.Directory, logger);
    }

    /**
     * Fetch files from directory
     */
    protected async fetchRaw(config: IngestionConfig): Promise<EmailFile[]> {
        const fileConfig = config as FileIngestionConfig;

        // Read files from directory
        const filesMap = await this.directoryReader.readFiles(
            fileConfig.path,
            fileConfig.recursive,
            fileConfig.filePattern
        );

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
     * Normalize files to BaseContent
     */
    protected async normalize(emailFiles: EmailFile[]): Promise<BaseContent[]> {
        const now = new Date();

        return emailFiles.map(file => new BaseContent(
            file.content,              // url field - contains the raw content
            SourceAdapter.Directory,   // source adapter
            [],                        // tags - empty initially
            '',                        // summary - empty initially
            file.content,              // raw content
            now,                       // created at
            now                        // updated at
        ));
    }
}
