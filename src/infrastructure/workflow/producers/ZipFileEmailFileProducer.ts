import { IProducer } from '../../../domain/workflow/IProducer.js';
import { EmailFile } from '../../../domain/entities/EmailFile.js';
import { IDirectoryReader } from '../../../domain/ports/IDirectoryReader.js';

/**
 * Producer: Extracts email files from a zip archive
 */
export class ZipFileEmailFileProducer implements IProducer<EmailFile> {
    constructor(
        private readonly filePath: string,
        private readonly directoryReader: IDirectoryReader
    ) { }

    async *produce(): AsyncIterable<EmailFile> {
        const files = await this.directoryReader.readFiles(this.filePath);

        for (const file of files) {
            yield {
                filename: file.filename,
                content: file.content,
            };
        }
    }
}
