import { IStage } from '../../../domain/workflow/IStage.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';
import { SourceAdapter } from "../../../domain/entities/SourceAdapter.js";
import { IContentAnalyser } from '../../../domain/ports/IContentAnalyser.js';
import { HtmlLinksParser } from '../../../utils/HtmlLinksParser.js';
import { EmailFile } from '../../../domain/entities/EmailFile.js';

export class EmlContentAnalyserStage implements IStage<EmailFile, Bookmark> {
    constructor(
        private readonly contentAnalyser: IContentAnalyser
    ) { }

    async *process(emailFile: EmailFile): AsyncIterable<Bookmark> {
        const htmlLinksParser = new HtmlLinksParser();
        const urls = htmlLinksParser.extractLinks(emailFile.content);
        const tagsAndSummary = await this.contentAnalyser.analyze(emailFile.content);

        if (urls.length > 0 && tagsAndSummary.tags.length > 0 && tagsAndSummary.summary.length > 0) {
            yield new Bookmark(urls[0], 'EmlFile', tagsAndSummary.tags, tagsAndSummary.summary, emailFile.content);
        }
    }
}
