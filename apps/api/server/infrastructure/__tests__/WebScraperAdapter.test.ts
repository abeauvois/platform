import { describe, test, expect, beforeEach } from 'bun:test';
import { WebScraperAdapter } from '../WebScraperAdapter.js';
import { html as linkedInPostHtml } from './fixtures.js';

// Test logger that captures log calls
const createTestLogger = () => ({
    logs: [] as Array<{ level: string; message: string }>,
    info: function (msg: string) {
        this.logs.push({ level: 'info', message: msg });
    },
    error: function (msg: string) {
        this.logs.push({ level: 'error', message: msg });
    },
    warning: function (msg: string) {
        this.logs.push({ level: 'warning', message: msg });
    },
    debug: function (msg: string) {
        this.logs.push({ level: 'debug', message: msg });
    },
});

// Create a testable subclass to expose private methods
class TestableWebScraperAdapter extends WebScraperAdapter {
    public testExtractBySelector(html: string, selector: string): string | null {
        return (this as any).extractBySelector(html, selector);
    }

    public testExtractTextContent(html: string): string {
        return (this as any).extractTextContent(html);
    }
}

describe('WebScraperAdapter', () => {
    let adapter: TestableWebScraperAdapter;
    let logger: ReturnType<typeof createTestLogger>;

    beforeEach(() => {
        logger = createTestLogger();
        adapter = new TestableWebScraperAdapter(logger);
    });

    describe('extractBySelector', () => {
        describe('class selector extraction', () => {
            test('should extract content by class selector from LinkedIn HTML', () => {
                const selector = '.fie-impression-container';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
                expect(result).toContain('fie-impression-container');
            });

            test('should extract content using compound selector with class', () => {
                const selector = '#ember35 > div > div > div.fie-impression-container';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
                expect(result).toContain('fie-impression-container');
            });

            test('should return null for non-existent class', () => {
                const selector = '.non-existent-class';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).toBeNull();
            });

            test('should handle class with hyphen in name', () => {
                const selector = '.update-components-actor';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
            });

            test('should handle class with underscore in name', () => {
                const selector = '.update-components-actor__container';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
            });
        });

        describe('ID selector extraction', () => {
            test('should extract content by ID selector', () => {
                const selector = '#ember36';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
                expect(result).toContain('ember36');
            });

            test('should extract content by ID in compound selector', () => {
                const selector = '#ember38 > button';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).not.toBeNull();
            });

            test('should return null for non-existent ID', () => {
                const selector = '#non-existent-id';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).toBeNull();
            });
        });

        describe('edge cases', () => {
            test('should return null for empty HTML', () => {
                const selector = '.some-class';
                const result = adapter.testExtractBySelector('', selector);

                expect(result).toBeNull();
            });

            test('should return null for selector without class or ID', () => {
                const selector = 'div > span';
                const result = adapter.testExtractBySelector(linkedInPostHtml, selector);

                expect(result).toBeNull();
            });

            test('should handle simple HTML with class', () => {
                const html = '<div class="test-class">Hello World</div>';
                const selector = '.test-class';
                const result = adapter.testExtractBySelector(html, selector);

                expect(result).not.toBeNull();
                expect(result).toContain('Hello World');
            });

            test('should handle simple HTML with ID', () => {
                const html = '<div id="test-id">Hello World</div>';
                const selector = '#test-id';
                const result = adapter.testExtractBySelector(html, selector);

                expect(result).not.toBeNull();
                expect(result).toContain('Hello World');
            });
        });
    });

    describe('extractTextContent', () => {
        test('should extract text from LinkedIn post content', () => {
            const result = adapter.testExtractTextContent(linkedInPostHtml);

            // Should contain the author name
            expect(result).toContain('Alexis Lemonnier');

            // Should contain part of the post content
            expect(result).toContain('15 liens Linkedin');
        });

        test('should remove script tags', () => {
            const html = '<div>Hello<script>alert("xss")</script>World</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).not.toContain('alert');
            expect(result).not.toContain('script');
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        test('should remove style tags', () => {
            const html = '<div>Hello<style>.foo { color: red; }</style>World</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).not.toContain('color');
            expect(result).not.toContain('style');
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        test('should remove HTML comments', () => {
            const html = '<div>Hello<!-- this is a comment -->World</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).not.toContain('comment');
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        test('should decode HTML entities', () => {
            const html = '<div>&amp; &lt; &gt; &quot; &#39;</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).toContain('&');
            expect(result).toContain('<');
            expect(result).toContain('>');
            expect(result).toContain('"');
            expect(result).toContain("'");
        });

        test('should normalize whitespace', () => {
            const html = '<div>Hello     World</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).not.toContain('     ');
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        test('should handle empty HTML', () => {
            const result = adapter.testExtractTextContent('');

            expect(result).toBe('');
        });

        test('should convert block elements to newlines', () => {
            const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
            const result = adapter.testExtractTextContent(html);

            expect(result).toContain('Paragraph 1');
            expect(result).toContain('Paragraph 2');
        });
    });

    describe('decodeHtmlEntities', () => {
        test('should decode numeric entities', () => {
            const html = '<div>&#65;&#66;&#67;</div>'; // ABC
            const result = adapter.testExtractTextContent(html);

            expect(result).toContain('ABC');
        });

        test('should decode hex entities', () => {
            const html = '<div>&#x41;&#x42;&#x43;</div>'; // ABC
            const result = adapter.testExtractTextContent(html);

            expect(result).toContain('ABC');
        });

        test('should decode common entities', () => {
            const html = '<div>&nbsp;&ndash;&mdash;&hellip;&copy;&reg;&trade;</div>';
            const result = adapter.testExtractTextContent(html);

            expect(result).toContain('–');
            expect(result).toContain('—');
            expect(result).toContain('…');
            expect(result).toContain('©');
            expect(result).toContain('®');
            expect(result).toContain('™');
        });
    });
});
