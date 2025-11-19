import { IStage } from '../../../domain/workflow';


export class HttpLinksParserStage implements IStage<string, string[]> {
    private readonly URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

    constructor() { }

    async *process(content: string): AsyncIterable<string[]> {
        const links = this.extractLinks(content);
        if (links.length > 0) {
            yield links
        }
    }

    extractLinks(emailContent: string): string[] {
        const links: string[] = [];
        const matches = emailContent.match(this.URL_REGEX);

        if (matches) {
            // Deduplicate and clean URLs
            const uniqueLinks = [...new Set(matches)];

            for (const link of uniqueLinks) {
                // Clean up common email artifacts
                let cleaned = link
                    .replace(/[,;.!?]+$/, '') // Remove trailing punctuation
                    .replace(/=\s*$/, '') // Remove trailing equals from quoted-printable
                    .replace(/=3D/g, '=') // Decode quoted-printable equals
                    .replace(/\s+/g, ''); // Remove any whitespace

                // Decode HTML entities if present
                cleaned = this.decodeHtmlEntities(cleaned);

                links.push(cleaned);
            }
        }

        return links;
    }

    private decodeHtmlEntities(text: string): string {
        const entities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&#x27;': "'",
            '&#x2F;': '/',
        };

        return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
    }
}
