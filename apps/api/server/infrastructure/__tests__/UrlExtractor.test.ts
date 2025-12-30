import { describe, expect, it } from 'bun:test';
import { UrlExtractor } from '../UrlExtractor';

describe('UrlExtractor', () => {
    const extractor = new UrlExtractor();

    describe('containsUrl', () => {
        it('should return true when content contains a URL', () => {
            const content = 'Check this out: https://example.com';
            expect(extractor.containsUrl(content)).toBe(true);
        });

        it('should return false when content has no URL', () => {
            const content = 'No links here';
            expect(extractor.containsUrl(content)).toBe(false);
        });

        it('should detect LinkedIn post URL with UTM parameters', () => {
            const content = 'https://www.linkedin.com/posts/alexis-lemonnier_15-liens-linkedin-que-vous-devez-absolument-share-7409885046049984512-OzuQ?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAAAAEYYQBAG8XEbAwDEP0PvuiZUVQs5HsO8o&utm_campaign=share_via';
            expect(extractor.containsUrl(content)).toBe(true);
        });
    });

    describe('extractFirst', () => {
        it('should extract the first URL from content', () => {
            const content = 'Visit https://example.com for more info';
            expect(extractor.extractFirst(content)).toBe('https://example.com');
        });

        it('should return empty string when no URL found', () => {
            const content = 'No links here';
            expect(extractor.extractFirst(content)).toBe('');
        });

        it('should extract LinkedIn post URL with UTM parameters', () => {
            const content = 'Check out this post: https://www.linkedin.com/posts/alexis-lemonnier_15-liens-linkedin-que-vous-devez-absolument-share-7409885046049984512-OzuQ?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAAAAEYYQBAG8XEbAwDEP0PvuiZUVQs5HsO8o&utm_campaign=share_via';
            expect(extractor.extractFirst(content)).toBe(
                'https://www.linkedin.com/posts/alexis-lemonnier_15-liens-linkedin-que-vous-devez-absolument-share-7409885046049984512-OzuQ?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAAAAEYYQBAG8XEbAwDEP0PvuiZUVQs5HsO8o&utm_campaign=share_via'
            );
        });

        it('should extract first URL when multiple URLs present', () => {
            const content = 'First: https://first.com then https://second.com';
            expect(extractor.extractFirst(content)).toBe('https://first.com');
        });
    });

    describe('regex lastIndex handling', () => {
        it('should work correctly when extractFirst is called before containsUrl', () => {
            const content = 'https://example.com/page';

            // Call extractFirst first (this used to break containsUrl due to lastIndex)
            const url = extractor.extractFirst(content);
            expect(url).toBe('https://example.com/page');

            // containsUrl should still work correctly
            expect(extractor.containsUrl(content)).toBe(true);
        });

        it('should work correctly when containsUrl is called before extractFirst', () => {
            const content = 'Check: https://example.com/test';

            expect(extractor.containsUrl(content)).toBe(true);
            expect(extractor.extractFirst(content)).toBe('https://example.com/test');
        });

        it('should work correctly with multiple sequential calls', () => {
            const content1 = 'https://first.com';
            const content2 = 'https://second.com';

            expect(extractor.extractFirst(content1)).toBe('https://first.com');
            expect(extractor.containsUrl(content2)).toBe(true);
            expect(extractor.extractFirst(content2)).toBe('https://second.com');
            expect(extractor.containsUrl(content1)).toBe(true);
        });
    });
});
