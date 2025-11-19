import Anthropic from '@anthropic-ai/sdk';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IContentAnalyser, TagsAndSummary } from '../../domain/ports/IContentAnalyser.js';

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022'; // Free tier model

export class AnthropicClient implements IContentAnalyser {
    private anthropic: any

    constructor(
        private readonly apiKey: string,
        private readonly model: string = DEFAULT_MODEL,
        private readonly logger: ILogger
    ) {
        this.initializeAnthropicClient();
    }

    private initializeAnthropicClient(): void {
        this.anthropic = new Anthropic({ apiKey: this.apiKey });
    }

    async analyze(url: string, additionalContext?: string): Promise<TagsAndSummary> {

        let prompt = `Analyze this URL and provide:
            1. An array of 2-3 short categorization tags (2-4 words max each, e.g., "AI/Machine Learning", "Climate Change", "Web Development", etc.)
            2. A description of what this link is about (200 words maximum)

            URL: ${url}`;

        if (additionalContext) {
            prompt += `\n\nAdditional context:\n${additionalContext}`;
        }

        prompt += `\n\nRespond in this exact JSON format:
            {
            "tags": ["your tags here as an array of strings"],
            "summary": "your summary here"
            }`;

        try {
            const message = await this.anthropic.messages.create({
                model: this.model || DEFAULT_MODEL,
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                // tools: [
                //     {
                //         name: 'web_search',
                //         type: 'web_search_20250305',
                //     },
                // ],
            });

            const content = message.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            // Extract JSON from response (handle potential markdown code blocks)
            const text = content.text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const result = JSON.parse(jsonMatch[0]);

            // Validate response structure
            if (!result.tags || !result.summary) {
                throw new Error('Invalid response structure from Claude');
            }

            // Ensure summary is within 200 words
            const words = result.summary.split(/\s+/);
            if (words.length > 200) {
                result.summary = words.slice(0, 200).join(' ') + '...';
            }

            return {
                tags: result.tags,
                summary: result.summary
            };
        } catch (error) {
            this.logger.error(`Error calling Anthropic API: ${error instanceof Error ? error.message : error}`);
            throw new Error(`Failed to analyze URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}

