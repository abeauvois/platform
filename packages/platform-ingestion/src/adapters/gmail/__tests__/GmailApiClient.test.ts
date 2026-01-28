/**
 * Unit Tests: Gmail API Client
 * Tests the Gmail API adapter implementation
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { gmail_v1 } from 'googleapis';
import { GmailApiClient, type GmailCredentials } from '../GmailApiClient.js';

// Define mock response types
type MessagesListResponse = { data: gmail_v1.Schema$ListMessagesResponse };
type MessagesGetResponse = { data: gmail_v1.Schema$Message | null };

// Mock the googleapis module
const mockMessagesList = mock<() => Promise<MessagesListResponse>>(() =>
    Promise.resolve({ data: { messages: [] } })
);
const mockMessagesGet = mock<() => Promise<MessagesGetResponse>>(() => Promise.resolve({ data: null }));

mock.module('googleapis', () => ({
    google: {
        auth: {
            OAuth2: class MockOAuth2 {
                setCredentials(_credentials: Record<string, unknown>) {
                    // Mock implementation - no-op
                }
            },
        },
        gmail: () => ({
            users: {
                messages: {
                    list: mockMessagesList,
                    get: mockMessagesGet,
                },
            },
        }),
    },
}));

describe('GmailApiClient', () => {
    let client: GmailApiClient;
    const credentials: GmailCredentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
    };

    beforeEach(() => {
        client = new GmailApiClient(credentials);
        mockMessagesList.mockReset();
        mockMessagesGet.mockReset();
    });

    describe('Constructor', () => {
        test('should create client with valid credentials', () => {
            expect(client).toBeInstanceOf(GmailApiClient);
        });
    });

    describe('fetchMessagesSince', () => {
        test('should return empty array when no messages found', async () => {
            mockMessagesList.mockResolvedValueOnce({ data: { messages: [] } });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toEqual([]);
        });

        test('should build correct query with date filter', async () => {
            mockMessagesList.mockResolvedValueOnce({ data: { messages: [] } });

            const since = new Date('2024-01-15T00:00:00Z');
            await client.fetchMessagesSince(since);

            expect(mockMessagesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'me',
                    q: expect.stringContaining('after:'),
                    maxResults: 100,
                })
            );
        });

        test('should add email filter to query when provided', async () => {
            mockMessagesList.mockResolvedValueOnce({ data: { messages: [] } });

            const since = new Date('2024-01-01');
            await client.fetchMessagesSince(since, 'test@example.com');

            expect(mockMessagesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringContaining('from:test@example.com'),
                })
            );
        });

        test('should fetch message details for each message in list', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: {
                    messages: [{ id: 'msg1' }, { id: 'msg2' }],
                },
            });

            mockMessagesGet
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg1',
                        snippet: 'Message 1',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Test Subject 1' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Hello World').toString('base64') },
                        },
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg2',
                        snippet: 'Message 2',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Test Subject 2' },
                                { name: 'From', value: 'sender2@example.com' },
                                { name: 'Date', value: 'Tue, 16 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Hello World 2').toString('base64') },
                        },
                    },
                });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(2);
            expect(mockMessagesGet).toHaveBeenCalledTimes(2);
        });

        test('should filter messages without URL when withUrl is true', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: {
                    messages: [{ id: 'msg1' }, { id: 'msg2' }],
                },
            });

            // Message with URL
            mockMessagesGet
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg1',
                        snippet: 'Has URL',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Check this link' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Visit https://example.com for more').toString('base64') },
                        },
                    },
                })
                // Message without URL
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg2',
                        snippet: 'No URL',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Plain message' },
                                { name: 'From', value: 'sender2@example.com' },
                                { name: 'Date', value: 'Tue, 16 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Just plain text').toString('base64') },
                        },
                    },
                });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since, undefined, true);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('https://example.com');
        });

        test('should include all messages when withUrl is false', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: {
                    messages: [{ id: 'msg1' }, { id: 'msg2' }],
                },
            });

            mockMessagesGet
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg1',
                        snippet: 'Has URL',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Check this' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Visit https://example.com').toString('base64') },
                        },
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg2',
                        snippet: 'No URL',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Plain' },
                                { name: 'From', value: 'sender2@example.com' },
                                { name: 'Date', value: 'Tue, 16 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Plain text').toString('base64') },
                        },
                    },
                });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since, undefined, false);

            expect(messages).toHaveLength(2);
        });

        test('should handle API errors gracefully', async () => {
            mockMessagesList.mockRejectedValueOnce(new Error('API quota exceeded'));

            const since = new Date('2024-01-01');

            await expect(client.fetchMessagesSince(since)).rejects.toThrow(
                'Failed to fetch Gmail messages: API quota exceeded'
            );
        });

        test('should skip messages without id', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: {
                    messages: [{ id: 'msg1' }, { id: undefined }, { id: 'msg3' }],
                },
            });

            mockMessagesGet
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg1',
                        snippet: 'Message 1',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Subject 1' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Content 1').toString('base64') },
                        },
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg3',
                        snippet: 'Message 3',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Subject 3' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Wed, 17 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Content 3').toString('base64') },
                        },
                    },
                });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(2);
            expect(mockMessagesGet).toHaveBeenCalledTimes(2);
        });
    });

    describe('URL Extraction', () => {
        test('should extract URL from subject and add to headers', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Check this out',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Read this article https://blog.example.com/post' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('No URL in body').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('url: https://blog.example.com/post');
        });

        test('should extract URL from body when not in subject', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Check this out',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Interesting article' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Check out https://example.com/article').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('url: https://example.com/article');
        });

        test('should prioritize URL from subject over body', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Multiple URLs',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Check https://subject-url.com' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Body has https://body-url.com').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('url: https://subject-url.com');
            expect(messages[0].rawContent).not.toContain('url: https://body-url.com');
        });
    });

    describe('Header Normalization', () => {
        test('should extract all standard headers', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Test message',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Test Subject' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            { name: 'X-Custom-Header', value: 'should be ignored' },
                        ],
                        body: { data: Buffer.from('Test content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            const rawContent = messages[0].rawContent;
            expect(rawContent).toContain('from: sender@example.com');
            expect(rawContent).toContain('to: recipient@example.com');
            expect(rawContent).toContain('subject: Test Subject');
            expect(rawContent).toContain('date: Mon, 15 Jan 2024 10:00:00 GMT');
            expect(rawContent).not.toContain('X-Custom-Header');
        });

        test('should handle case-insensitive header lookup', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Test message',
                    payload: {
                        headers: [
                            { name: 'SUBJECT', value: 'Uppercase Subject' },
                            { name: 'from', value: 'lowercase@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].subject).toBe('Uppercase Subject');
            expect(messages[0].from).toBe('lowercase@example.com');
        });

        test('should use current date when Date header is missing', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            const beforeTest = new Date();

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'No date',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'No date header' },
                            { name: 'From', value: 'sender@example.com' },
                        ],
                        body: { data: Buffer.from('Content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            const afterTest = new Date();

            expect(messages).toHaveLength(1);
            expect(messages[0].receivedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
            expect(messages[0].receivedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
        });
    });

    describe('Body Content Extraction', () => {
        test('should extract text/plain content', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Plain text',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Plain Text Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'text/plain',
                                body: { data: Buffer.from('This is plain text content').toString('base64') },
                            },
                            {
                                mimeType: 'text/html',
                                body: { data: Buffer.from('<p>This is HTML content</p>').toString('base64') },
                            },
                        ],
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('This is plain text content');
            expect(messages[0].rawContent).not.toContain('<p>');
        });

        test('should fallback to text/html when text/plain not available', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'HTML only',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'HTML Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'text/html',
                                body: { data: Buffer.from('<p>This is HTML content</p>').toString('base64') },
                            },
                        ],
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('This is HTML content');
            expect(messages[0].rawContent).not.toContain('<p>');
        });

        test('should strip HTML tags from HTML content', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Complex HTML',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Rich Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'text/html',
                                body: {
                                    data: Buffer.from(
                                        '<html><body><h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p></body></html>'
                                    ).toString('base64'),
                                },
                            },
                        ],
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('Title');
            expect(messages[0].rawContent).toContain('Paragraph with');
            expect(messages[0].rawContent).toContain('bold');
            expect(messages[0].rawContent).not.toContain('<html>');
            expect(messages[0].rawContent).not.toContain('<strong>');
        });

        test('should handle direct body data without parts', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Simple message',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Simple Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Direct body content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('Direct body content');
        });

        test('should handle nested multipart content', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Nested',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Nested Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'multipart/alternative',
                                parts: [
                                    {
                                        mimeType: 'text/plain',
                                        body: { data: Buffer.from('Nested plain text').toString('base64') },
                                    },
                                ],
                            },
                        ],
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('Nested plain text');
        });
    });

    describe('GmailMessage Object', () => {
        test('should return properly structured GmailMessage', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg123' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg123',
                    snippet: 'This is a snippet',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Test Subject' },
                            { name: 'From', value: 'John Doe <john@example.com>' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:30:00 GMT' },
                        ],
                        body: { data: Buffer.from('Email body content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);

            const msg = messages[0];
            expect(msg.id).toBe('msg123');
            expect(msg.subject).toBe('Test Subject');
            expect(msg.from).toBe('John Doe <john@example.com>');
            expect(msg.snippet).toBe('This is a snippet');
            expect(msg.receivedAt).toEqual(new Date('Mon, 15 Jan 2024 10:30:00 GMT'));
            expect(msg.rawContent).toContain('Email body content');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null message list response', async () => {
            // Use type assertion to test edge case where API returns null (not in types but possible at runtime)
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: null as unknown as undefined },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toEqual([]);
        });

        test('should handle undefined message list response', async () => {
            mockMessagesList.mockResolvedValueOnce({ data: { messages: undefined } });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toEqual([]);
        });

        test('should skip message when fetchMessageDetails returns null', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }, { id: 'msg2' }] },
            });

            // First message returns null (simulating fetch error)
            mockMessagesGet
                .mockResolvedValueOnce({ data: null })
                .mockResolvedValueOnce({
                    data: {
                        id: 'msg2',
                        snippet: 'Valid message',
                        payload: {
                            headers: [
                                { name: 'Subject', value: 'Valid' },
                                { name: 'From', value: 'sender@example.com' },
                                { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                            ],
                            body: { data: Buffer.from('Content').toString('base64') },
                        },
                    },
                });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].id).toBe('msg2');
        });

        test('should handle empty snippet', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: '',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'No snippet' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].snippet).toBe('');
        });

        test('should handle missing payload headers', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'No headers',
                    payload: {
                        headers: undefined,
                        body: { data: Buffer.from('Content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].subject).toBe('');
            expect(messages[0].from).toBe('');
        });

        test('should handle empty payload', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Empty payload',
                    payload: undefined,
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('');
        });

        test('should handle URL with special characters', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Special URL',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Check this' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: {
                            data: Buffer.from(
                                'Visit https://example.com/path?query=value&foo=bar#section'
                            ).toString('base64'),
                        },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('url: https://example.com/path?query=value&foo=bar#section');
        });

        test('should extract URL from body content', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'URL in body',
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Check this' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: {
                            data: Buffer.from('Check out https://example.com/page for more info').toString(
                                'base64'
                            ),
                        },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].rawContent).toContain('url: https://example.com/page');
        });
    });

    describe('Subject Truncation', () => {
        test('should not truncate subject under 100 characters', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            const shortSubject = 'This is a short subject that fits within the limit';

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Short subject',
                    payload: {
                        headers: [
                            { name: 'Subject', value: shortSubject },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Body content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            expect(messages[0].subject).toBe(shortSubject);
            expect(messages[0].rawContent).not.toContain('[Full Subject]:');
        });

        test('should truncate subject over 100 characters and prepend full subject to body', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            const longSubject =
                'This is a very long subject line that exceeds the maximum allowed length of one hundred characters and should be truncated';

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Long subject',
                    payload: {
                        headers: [
                            { name: 'Subject', value: longSubject },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Original body content').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            // Subject should be truncated
            expect(messages[0].subject.length).toBeLessThanOrEqual(100);
            expect(messages[0].subject).toContain('...');
            // Full subject should be prepended to body in rawContent
            expect(messages[0].rawContent).toContain(`[Full Subject]: ${longSubject}`);
            expect(messages[0].rawContent).toContain('Original body content');
        });

        test('should truncate at word boundary when possible', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            // Create a subject where truncation should happen at a word boundary
            const longSubject =
                'This subject has words that should allow for clean truncation at a word boundary instead of mid-word cutting';

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Word boundary test',
                    payload: {
                        headers: [
                            { name: 'Subject', value: longSubject },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Body').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            // Subject should end with ... and not cut mid-word
            expect(messages[0].subject).toMatch(/\w\.\.\.$/);
            expect(messages[0].subject.length).toBeLessThanOrEqual(100);
        });

        test('should handle subject exactly at 100 characters', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            // Create exactly 100 character subject
            const exactSubject = 'A'.repeat(100);

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Exact length',
                    payload: {
                        headers: [
                            { name: 'Subject', value: exactSubject },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Body').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            // Should not be truncated
            expect(messages[0].subject).toBe(exactSubject);
            expect(messages[0].rawContent).not.toContain('[Full Subject]:');
        });

        test('should handle subject at 101 characters (just over limit)', async () => {
            mockMessagesList.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }] },
            });

            // Create 101 character subject
            const overLimitSubject = 'A'.repeat(101);

            mockMessagesGet.mockResolvedValueOnce({
                data: {
                    id: 'msg1',
                    snippet: 'Just over limit',
                    payload: {
                        headers: [
                            { name: 'Subject', value: overLimitSubject },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Body').toString('base64') },
                    },
                },
            });

            const since = new Date('2024-01-01');
            const messages = await client.fetchMessagesSince(since);

            expect(messages).toHaveLength(1);
            // Should be truncated
            expect(messages[0].subject.length).toBeLessThanOrEqual(100);
            expect(messages[0].subject).toContain('...');
            expect(messages[0].rawContent).toContain(`[Full Subject]: ${overLimitSubject}`);
        });
    });
});
