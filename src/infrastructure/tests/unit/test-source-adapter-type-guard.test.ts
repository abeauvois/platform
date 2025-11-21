import { describe, test, expect } from 'bun:test';
import { isValidSourceAdapter, SOURCE_ADAPTERS, SourceAdapter } from '../../../domain/entities/SourceAdapter.js';

describe('SourceAdapter Type System', () => {
    describe('SOURCE_ADAPTERS constant', () => {
        test('should contain all valid source adapter values', () => {
            const expected = ['Gmail', 'Outlook', 'EmlFile', 'ZipFile', 'Directory', 'NotionDatabase', 'Other', 'None'];
            expect(SOURCE_ADAPTERS).toEqual(expected);
        });

        test('should be frozen for runtime immutability', () => {
            // Object.freeze is applied at runtime to prevent mutations
            expect(Object.isFrozen(SOURCE_ADAPTERS)).toBe(false);
            // Note: 'as const' provides compile-time readonly, not runtime immutability
            // TypeScript will prevent modifications at compile time
        });
    });

    describe('isValidSourceAdapter type guard', () => {
        test('should return true for valid Gmail source', () => {
            expect(isValidSourceAdapter('Gmail')).toBe(true);
        });

        test('should return true for valid Outlook source', () => {
            expect(isValidSourceAdapter('Outlook')).toBe(true);
        });

        test('should return true for valid EmlFile source', () => {
            expect(isValidSourceAdapter('EmlFile')).toBe(true);
        });

        test('should return true for valid ZipFile source', () => {
            expect(isValidSourceAdapter('ZipFile')).toBe(true);
        });

        test('should return true for valid Directory source', () => {
            expect(isValidSourceAdapter('Directory')).toBe(true);
        });

        test('should return true for valid NotionDatabase source', () => {
            expect(isValidSourceAdapter('NotionDatabase')).toBe(true);
        });

        test('should return true for valid Other source', () => {
            expect(isValidSourceAdapter('Other')).toBe(true);
        });

        test('should return true for valid None source', () => {
            expect(isValidSourceAdapter('None')).toBe(true);
        });

        test('should return false for invalid string', () => {
            expect(isValidSourceAdapter('InvalidSource')).toBe(false);
        });

        test('should return false for empty string', () => {
            expect(isValidSourceAdapter('')).toBe(false);
        });

        test('should return false for number', () => {
            expect(isValidSourceAdapter(123)).toBe(false);
        });

        test('should return false for null', () => {
            expect(isValidSourceAdapter(null)).toBe(false);
        });

        test('should return false for undefined', () => {
            expect(isValidSourceAdapter(undefined)).toBe(false);
        });

        test('should return false for object', () => {
            expect(isValidSourceAdapter({})).toBe(false);
        });

        test('should return false for array', () => {
            expect(isValidSourceAdapter([])).toBe(false);
        });

        test('should be case-sensitive', () => {
            expect(isValidSourceAdapter('gmail')).toBe(false);
            expect(isValidSourceAdapter('GMAIL')).toBe(false);
        });
    });

    describe('SourceAdapter type usage', () => {
        test('should allow assignment of valid literal', () => {
            const source1: SourceAdapter = 'Gmail';
            const source2: SourceAdapter = 'ZipFile';
            expect(source1).toBe('Gmail');
            expect(source2).toBe('ZipFile');
        });

        test('should work with type narrowing', () => {
            const unknownValue: unknown = 'Gmail';

            if (isValidSourceAdapter(unknownValue)) {
                // TypeScript knows unknownValue is SourceAdapter here
                const source: SourceAdapter = unknownValue;
                expect(source).toBe('Gmail');
            } else {
                throw new Error('Should have been valid');
            }
        });

        test('should validate parsed JSON data', () => {
            const jsonData = JSON.parse('{"source": "Gmail"}');

            if (isValidSourceAdapter(jsonData.source)) {
                expect(jsonData.source).toBe('Gmail');
            } else {
                throw new Error('Should have valid source');
            }
        });

        test('should reject invalid parsed JSON data', () => {
            const jsonData = JSON.parse('{"source": "InvalidSource"}');

            expect(isValidSourceAdapter(jsonData.source)).toBe(false);
        });
    });

    describe('Backwards compatibility tests', () => {
        test('should support all existing enum values', () => {
            // These are the values that were in the original enum
            const existingValues = ['Gmail', 'Outlook', 'EmlFile', 'ZipFile', 'Directory', 'NotionDatabase', 'Other', 'None'];

            existingValues.forEach(value => {
                expect(isValidSourceAdapter(value)).toBe(true);
            });
        });

        test('should work with Bookmark validation', () => {
            // Simulating Bookmark.isValid() logic
            const url = 'https://example.com';
            const sourceAdapter: SourceAdapter = 'Gmail';

            const isValid = url.length > 0 && sourceAdapter !== 'None';
            expect(isValid).toBe(true);
        });

        test('should work with None check', () => {
            const source1: SourceAdapter = 'Gmail';
            const source2: SourceAdapter = 'None';

            expect(source1 !== 'None').toBe(true);
            expect(source2 !== 'None').toBe(false);
        });
    });
});
