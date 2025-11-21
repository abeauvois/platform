import { IStage } from '../../../domain/workflow/IStage.js';
import { Bookmark } from '../../../domain/entities/Bookmark';
import { SourceAdapter } from "../../../domain/entities/SourceAdapter.js";
import { GmailMessage } from '../../../domain/entities/GmailMessage.js';
import { IContentAnalyser } from '../../../domain/ports/IContentAnalyser.js';
import { HtmlLinksParser } from '../../../utils/HtmlLinksParser.js';

export class GmailContentAnalyserStage implements IStage<GmailMessage, Bookmark> {
    constructor(
        private readonly contentAnalyser: IContentAnalyser
    ) { }

    async *process(gmailMessage: GmailMessage): AsyncIterable<Bookmark> {
        const htmlLinksParser = new HtmlLinksParser();
        const urls = htmlLinksParser.extractLinks(gmailMessage.rawContent);
        const tagsAndSummary = await this.contentAnalyser.analyze(gmailMessage.rawContent);

        if (urls.length > 0 && tagsAndSummary.tags.length > 0 && tagsAndSummary.summary.length > 0) {
            yield new Bookmark(urls[0], 'Gmail', tagsAndSummary.tags, tagsAndSummary.summary, gmailMessage.rawContent);
        }
    }
}
