import { describe, it, expect } from 'bun:test';
import { parseJsonResponse } from '../parseJsonResponse';

describe('parseJsonResponse', () => {
    it('should parse raw JSON', () => {
        const input = '{"urls": ["https://example.com"]}';
        const result = parseJsonResponse<{ urls: string[] }>(input);
        expect(result).toEqual({ urls: ['https://example.com'] });
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
        const input = '```json\n{"urls": ["https://example.com"]}\n```';
        const result = parseJsonResponse<{ urls: string[] }>(input);
        expect(result).toEqual({ urls: ['https://example.com'] });
    });

    it('should parse JSON with surrounding text from AI response', () => {
        const input = `here are the 3 most relevant and valuable URLs from the page:

{"urls": [
  "https://urlr.me/6SeahT",
  "https://urlr.me/SyVNbE",
  "https://urlr.me/PYzqKs"
]}

These UR`;

        const result = parseJsonResponse<{ urls: string[] }>(input);
        expect(result).toEqual({
            urls: [
                'https://urlr.me/6SeahT',
                'https://urlr.me/SyVNbE',
                'https://urlr.me/PYzqKs',
            ],
        });
    });

    it('should return null for invalid JSON', () => {
        const input = 'not valid json at all';
        const result = parseJsonResponse<{ urls: string[] }>(input);
        expect(result).toBeNull();
    });

    it('should handle empty input', () => {
        const result = parseJsonResponse<{ urls: string[] }>('');
        expect(result).toBeNull();
    });
});
