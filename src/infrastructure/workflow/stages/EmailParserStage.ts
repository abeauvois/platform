import { IStage } from '../../../domain/workflow/IStage.js';
import { EmailFile } from '../../../domain/entities/EmailFile.js';
import { EmailLink } from '../../../domain/entities/EmailLink.js';
import { ILinksExtractor } from '../../../domain/ports/ILinksExtractor.js';

/**
 * Stage: Parses links from email files
 * Transforms EmailFile into EmailLink objects
 */
export class EmailParserStage implements IStage<EmailFile, EmailLink> {
    constructor(
        private readonly linksExtractor: ILinksExtractor
    ) { }

    async *process(emailFile: EmailFile): AsyncIterable<EmailLink> {
        const links = this.linksExtractor.extractLinks(emailFile.content);

        if (links.length > 0) {
            // Currently taking the first link as the main link
            const mainLink = links[0];
            yield new EmailLink(mainLink, '', '', emailFile.filename);
        }
    }
}
