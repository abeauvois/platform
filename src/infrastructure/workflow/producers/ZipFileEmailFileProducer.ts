import { IProducer } from '../../../domain/workflow/IProducer.js';
import { EmailFile } from '../../../domain/entities/EmailFile.js';
import { IZipExtractor } from '../../../domain/ports/IZipExtractor.js';

/**
 * Producer: Extracts email files from a zip archive or directory
 */
export class ZipFileEmailFileProducer implements IProducer<EmailFile> {
    constructor(
        private readonly filePath: string,
        private readonly zipExtractor: IZipExtractor
    ) { }

    async *produce(): AsyncIterable<EmailFile> {
        const emailFiles = await this.zipExtractor.extractFiles(this.filePath);

        for (const [filename, content] of emailFiles.entries()) {
            yield {
                filename,
                content,
            };
        }
    }
}
