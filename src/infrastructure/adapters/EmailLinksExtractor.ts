import { ILinksExtractor } from '../../domain/ports/ILinksExtractor';

/**
 * Adapter: Parses MIME format emails and extracts HTTP/HTTPS links
 */
export class EmailLinksExtractor implements ILinksExtractor {
    private readonly URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

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
