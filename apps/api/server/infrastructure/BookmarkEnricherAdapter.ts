import Anthropic from '@anthropic-ai/sdk';
import { MAX_EXTRACTED_URLS } from '@abeauvois/platform-domain';
import { parseJsonResponse } from './parseJsonResponse';
import type { ContentAnalysisResult, IBookmarkEnricher, ILogger, UrlExtractionResult } from '@abeauvois/platform-domain';

/**
 * Adapter implementing IBookmarkEnricher using Anthropic Claude API
 *
 * Two-level enrichment:
 * 1. extractUrls: Find relevant URLs from page content
 * 2. analyzeContent: Generate tags and summary for a URL's content
 */
export class BookmarkEnricherAdapter implements IBookmarkEnricher {
    private readonly client: Anthropic;

    constructor(
        private readonly apiKey: string,
        private readonly logger: ILogger
    ) {
        this.client = new Anthropic({ apiKey });
    }

    async extractUrls(url: string, pageContent: string): Promise<UrlExtractionResult> {
        try {
            // Truncate content to avoid token limits
            const truncatedContent = pageContent.slice(0, 15000);
            console.log("🚀 ~ BookmarkEnricherAdapter ~ extractUrls ~ truncatedContent:", truncatedContent)

            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: `You are analyzing a webpage to extract the most relevant and valuable URLs for bookmarking.

Source URL: ${url} and limiting your analysis to the following content.

Page Content:
${truncatedContent}

if linkedin.com domain of the url then only analyze this dom part with selector "#ember35 > div > div > div.fie-impression-container"

Extract the ${MAX_EXTRACTED_URLS} most relevant and valuable URLs from this page. Focus on:
- Main article or content links (not navigation, footer, or sidebar links)
- Links that lead to substantive content (articles, resources, tools)
- Links that are likely to be worth saving for later reference

Return ONLY a JSON object in this exact format:
{"urls": ["https://example1.com", "https://example2.com", "https://example3.com"]}

If no relevant URLs are found, return: {"urls": []}
Do not include the source URL itself.
Only return valid, complete URLs starting with http:// or https://`,
                    },
                ],
            });

            const textContent = response.content[0];
            if (textContent.type !== 'text') {
                return { extractedUrls: [] };
            }

            const parsed = parseJsonResponse<{ urls: Array<string> }>(textContent.text);
            const urls = [...new Set(
                (parsed?.urls || [])
                    .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
            )].slice(0, MAX_EXTRACTED_URLS);

            this.logger.info(`Extracted ${urls.length} URLs from ${url}`);
            this.logger.info(`These URLs are ${urls.join(', ')}`);
            return { extractedUrls: urls };
        } catch (error) {
            this.logger.error(`Failed to extract URLs from ${url}: ${error instanceof Error ? error.message : error}`);
            return { extractedUrls: [] };
        }
    }

    async analyzeContent(url: string, pageContent: string): Promise<ContentAnalysisResult> {
        try {
            // Truncate content to avoid token limits
            const truncatedContent = pageContent.slice(0, 10000);

            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 512,
                messages: [
                    {
                        role: 'user',
                        content: `You are analyzing a webpage to generate categorization tags and a summary for bookmarking.

URL: ${url}

Page Content:
${truncatedContent}

Generate:
1. 3-5 relevant tags that categorize this content (lowercase, single words or short phrases)
2. A concise 1-2 sentence summary of what this page is about

Return ONLY a JSON object in this exact format:
{"tags": ["tag1", "tag2", "tag3"], "summary": "Brief summary of the content."}`,
                    },
                ],
            });

            const textContent = response.content[0];
            if (textContent.type !== 'text') {
                return { tags: [], summary: '' };
            }

            const parsed = parseJsonResponse<{ tags: Array<string>; summary: string }>(textContent.text);
            return {
                tags: parsed?.tags || [],
                summary: parsed?.summary || '',
            };
        } catch (error) {
            this.logger.error(`Failed to analyze content for ${url}: ${error instanceof Error ? error.message : error}`);
            return { tags: [], summary: '' };
        }
    }

}
