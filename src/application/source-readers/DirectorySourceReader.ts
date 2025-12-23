import { AbstractFileSourceReader } from './AbstractFileSourceReader';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { RawFile } from '../../domain/entities/RawFile.js';
import { FileIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Directory Source Reader
 * Reads and normalizes files from a directory or zip archive into BaseContent
 * Supports recursive scanning and file pattern filtering
 */
export class DirectorySourceReader extends AbstractFileSourceReader<RawFile, BaseContent> {
    constructor(
        private readonly directoryReader: IDirectoryReader,
        logger: ILogger
    ) {
        super('Directory', logger);
    }

    /**
     * Fetch files from directory or zip archive
     */
    protected async fetchRaw(config: IngestionConfig): Promise<RawFile[]> {
        const fileConfig = config as FileIngestionConfig;

        return this.directoryReader.readFiles(
            fileConfig.path,
            fileConfig.recursive,
            fileConfig.filePattern
        );
    }

    /**
     * Normalize files to BaseContent
     */
    protected async normalize(files: RawFile[]): Promise<BaseContent[]> {
        const now = new Date();

        return files.map(file => new BaseContent(
            file.content,
            'Directory',
            [],
            '',
            file.content,
            now,
            now,
            file.fileType
        ));
    }
}
