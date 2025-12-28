import { describe, test, expect } from 'bun:test';
import { truncateText } from '../truncate';

describe('truncateText', () => {
    describe('basic truncation', () => {
        test('should return original text when under maxLength', () => {
            const text = 'Hello World';
            const result = truncateText(text, 20);
            expect(result).toBe('Hello World');
        });

        test('should return original text when exactly at maxLength', () => {
            const text = 'Hello World';
            const result = truncateText(text, 11);
            expect(result).toBe('Hello World');
        });

        test('should truncate text over maxLength with default suffix', () => {
            const text = 'Hello World';
            const result = truncateText(text, 8);
            expect(result.length).toBeLessThanOrEqual(8);
            expect(result).toContain('...');
        });

        test('should handle empty string', () => {
            const result = truncateText('', 10);
            expect(result).toBe('');
        });
    });

    describe('word boundary behavior', () => {
        test('should break at word boundary when possible', () => {
            const text = 'The quick brown fox jumps over the lazy dog';
            const result = truncateText(text, 25);
            // With maxLength=25, truncateAt=22, threshold at 15.4
            // "The quick brown fox " is 20 chars, space at 19 > 15.4 so breaks there
            expect(result).toBe('The quick brown fox...');
            expect(result.length).toBeLessThanOrEqual(25);
        });

        test('should not break at word boundary when too early in text', () => {
            // If word boundary is before 70% threshold, cut mid-word
            const text = 'Superlongwordwithoutspaces';
            const result = truncateText(text, 15);
            expect(result.length).toBeLessThanOrEqual(15);
            expect(result).toContain('...');
        });

        test('should handle text with only one word', () => {
            const text = 'Supercalifragilisticexpialidocious';
            const result = truncateText(text, 20);
            expect(result.length).toBeLessThanOrEqual(20);
            expect(result).toContain('...');
        });
    });

    describe('custom suffix', () => {
        test('should use custom suffix when provided', () => {
            const text = 'Hello World';
            const result = truncateText(text, 8, '…');
            expect(result).toContain('…');
            expect(result).not.toContain('...');
        });

        test('should handle empty suffix', () => {
            const text = 'Hello World';
            const result = truncateText(text, 5, '');
            expect(result).toBe('Hello');
        });
    });

    describe('word boundary threshold', () => {
        test('should respect custom wordBoundaryThreshold', () => {
            const text = 'Hi there everyone';
            // With low threshold (0.1), should break at first space after 10% of truncation point
            const result = truncateText(text, 15, '...', 0.1);
            expect(result.length).toBeLessThanOrEqual(15);
        });

        test('should use 0.7 threshold by default', () => {
            const text = 'A B C D E F G H I J K L M N O P';
            const result = truncateText(text, 20);
            // Default behavior - break at word boundary if after 70% of truncation point
            expect(result.length).toBeLessThanOrEqual(20);
            expect(result).toContain('...');
        });
    });

    describe('edge cases', () => {
        test('should handle maxLength smaller than suffix', () => {
            const text = 'Hello World';
            const result = truncateText(text, 2);
            // When maxLength is smaller than suffix, behavior may vary
            // but should not throw
            expect(result.length).toBeLessThanOrEqual(3); // At minimum "..."
        });

        test('should handle special characters', () => {
            const text = 'Hello <world> & "friends"!';
            const result = truncateText(text, 15);
            expect(result.length).toBeLessThanOrEqual(15);
        });

        test('should handle unicode characters', () => {
            const text = 'Hello 世界 🌍';
            const result = truncateText(text, 10);
            expect(result.length).toBeLessThanOrEqual(10);
        });

        test('should handle multiple consecutive spaces', () => {
            const text = 'Hello    World';
            const result = truncateText(text, 10);
            expect(result.length).toBeLessThanOrEqual(10);
        });
    });

    describe('URL truncation use case', () => {
        test('should truncate URLs properly', () => {
            const url = 'https://example.com/very/long/path/to/resource?query=value';
            const result = truncateText(url, 40);
            expect(result.length).toBeLessThanOrEqual(40);
            expect(result).toContain('...');
        });
    });
});
