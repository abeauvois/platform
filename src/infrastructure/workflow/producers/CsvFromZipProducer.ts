import { IProducer } from '../../../domain/workflow/IProducer.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { DirectorySourceReader } from '../../../application/source-readers/DirectorySourceReader.js';
import { ICsvParser } from '../../../domain/ports/ICsvParser.js';
import { CsvParserStage } from '../stages/CsvParserStage.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';

/**
 * Producer: Extracts CSV files from zip or directory and yields parsed BaseContent items
 * Combines DirectorySourceReader extraction with CsvParserStage parsing
 */
export class CsvFromZipProducer implements IProducer<BaseContent> {
    constructor(
        private readonly sourceReader: DirectorySourceReader,
        private readonly csvParser: ICsvParser,
        private readonly config: FileIngestionConfig
    ) { }

    async *produce(): AsyncIterable<BaseContent> {
        // 1. Extract raw content from zip using SourceReader
        const rawContent = await this.sourceReader.ingest(this.config);

        // 2. Parse CSV content through CsvParserStage
        const csvStage = new CsvParserStage(this.csvParser);

        // 3. Yield each parsed BaseContent item
        for (const content of rawContent) {
            for await (const parsed of csvStage.process(content)) {
                yield parsed;
            }
        }
    }
}
