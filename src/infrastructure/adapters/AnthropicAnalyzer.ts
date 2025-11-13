import Anthropic from '@anthropic-ai/sdk';
import { ILinkAnalyzer, LinkAnalysis } from '../../domain/ports/ILinkAnalyzer.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Adapter: Implements link analysis using Anthropic's Claude API
 */
export class AnthropicAnalyzer implements ILinkAnalyzer {
    private readonly client: Anthropic;
    private readonly model = 'claude-3-5-haiku-20241022'; // Free tier model

    constructor(
        apiKey: string,
        private readonly logger: ILogger
    ) {
        this.client = new Anthropic({ apiKey });
    }

    private isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }

    async analyze(url: string, additionalContext?: string): Promise<LinkAnalysis> {

        if (!additionalContext && this.isTwitterUrl(url)) {
            return { tag: 'Unknown', description: 'No additional context provided.' };
        }

        let prompt = `Analyze this URL and provide:
1. A short categorization tag (2-4 words max, e.g., "AI/Machine Learning", "Climate Change", "Web Development", etc.)
2. A description of what this link is about (200 words maximum)

URL: ${url}`;

        if (additionalContext) {
            prompt += `\n\nAdditional context (tweet content):\n${additionalContext}`;
        }

        prompt += `\n\nRespond in this exact JSON format:
{
  "tag": "your tag here",
  "description": "your description here"
}`;

        try {
            const message = await this.client.messages.create({
                model: this.model,
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
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
            if (!result.tag || !result.description) {
                throw new Error('Invalid response structure from Claude');
            }

            // Ensure description is within 200 words
            const words = result.description.split(/\s+/);
            if (words.length > 200) {
                result.description = words.slice(0, 200).join(' ') + '...';
            }

            return {
                tag: result.tag,
                description: result.description
            };
        } catch (error) {
            this.logger.error(`Error calling Anthropic API: ${error instanceof Error ? error.message : error}`);
            throw new Error(`Failed to analyze URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
