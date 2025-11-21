import { IProducer } from '../../../domain/workflow/IProducer.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { ZipFileDataSource } from '../../adapters/ZipFileDataSource.js';
import { ICsvParser } from '../../../domain/ports/ICsvParser.js';
import { CsvParserStage } from '../stages/CsvParserStage.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';

/**
 * Producer: Extracts CSV files from zip and yields parsed BaseContent items
 * Combines ZipFileDataSource extraction with CsvParserStage parsing
 */
export class CsvFromZipProducer implements IProducer<BaseContent> {
    constructor(
        private readonly dataSource: ZipFileDataSource,
        private readonly csvParser: ICsvParser,
        private readonly config: FileIngestionConfig
    ) { }

    async *produce(): AsyncIterable<BaseContent> {
        // 1. Extract raw content from zip using DataSource
        const rawContent = await this.dataSource.ingest(this.config);

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
