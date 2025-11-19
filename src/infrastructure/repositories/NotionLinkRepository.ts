import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse, QueryDataSourceResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ILinkRepository } from '../../domain/ports/ILinkRepository.js';

/**
 * Notion Implementation of ILinkRepository
 * Stores and retrieves Bookmark entities from a Notion database
 */
export class NotionLinkRepository implements ILinkRepository {
    private readonly client: Client;
    private readonly databaseId: string;

    constructor(notionToken: string, databaseId: string) {
        this.client = new Client({
            auth: notionToken,
            notionVersion: "2025-09-03",
        });
        this.databaseId = databaseId;
    }

    async exists(url: string): Promise<boolean> {
        const link = await this.findByUrl(url);
        return link !== null;
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        try {
            const pageId = await this.findPageIdByUrl(url);
            if (!pageId) {
                return null;
            }

            // Retrieve the page properties
            const page = await this.client.pages.retrieve({ page_id: pageId });

            if (!('properties' in page)) {
                return null;
            }

            // Extract properties
            const properties = page.properties;

            // Get URL from title
            let urlValue = '';
            if ('Link' in properties && properties.Link.type === 'title') {
                const titleArray = properties.Link.title;
                urlValue = titleArray.map(t => t.plain_text).join('');
            }

            // Get tag from multi_select
            let tag = '';
            if ('Tag' in properties && properties.Tag.type === 'multi_select') {
                const tags = properties.Tag.multi_select;
                tag = tags.length > 0 ? tags[0].name : '';
            }

            // Get description from rich_text
            let description = '';
            if ('Description' in properties && properties.Description.type === 'rich_text') {
                const richText = properties.Description.rich_text;
                description = richText.map(t => t.plain_text).join('');
            }

            // Get timestamps
            let createdAt = new Date();
            if ('CreatedAt' in properties && properties.CreatedAt.type === 'date' && properties.CreatedAt.date) {
                createdAt = new Date(properties.CreatedAt.date.start);
            }

            let updatedAt = new Date();
            if ('UpdatedAt' in properties && properties.UpdatedAt.type === 'date' && properties.UpdatedAt.date) {
                updatedAt = new Date(properties.UpdatedAt.date.start);
            }

            return new Bookmark(urlValue, tag, description, '', createdAt, updatedAt);
        } catch (error) {
            console.error(`Error finding link by URL: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    async save(link: Bookmark): Promise<void> {
        try {
            // Check if already exists
            const existing = await this.findPageIdByUrl(link.url);

            if (existing) {
                // Update existing page
                await this.updatePage(existing, link);
            } else {
                // Create new page
                await this.createPage(link);
            }
        } catch (error) {
            throw new Error(`Failed to save link to Notion: ${error instanceof Error ? error.message : error}`);
        }
    }

    async saveMany(links: Bookmark[]): Promise<void> {
        for (const link of links) {
            await this.save(link);
        }
    }

    async findAll(): Promise<Bookmark[]> {
        try {
            const links: Bookmark[] = [];
            let hasMore = true;
            let startCursor: string | undefined = undefined;

            while (hasMore) {
                const response: any = await (this.client.databases as any).query({
                    database_id: this.databaseId,
                    start_cursor: startCursor,
                });

                for (const page of response.results) {
                    if (!('properties' in page)) continue;

                    const properties = page.properties;

                    // Extract URL
                    let url = '';
                    if ('Link' in properties && properties.Link.type === 'title') {
                        url = properties.Link.title.map((t: any) => t.plain_text).join('');
                    }

                    // Extract tag
                    let tag = '';
                    if ('Tag' in properties && properties.Tag.type === 'multi_select') {
                        const tags = properties.Tag.multi_select;
                        tag = tags.length > 0 ? tags[0].name : '';
                    }

                    // Extract description
                    let description = '';
                    if ('Description' in properties && properties.Description.type === 'rich_text') {
                        description = properties.Description.rich_text.map((t: any) => t.plain_text).join('');
                    }

                    // Get timestamps
                    let createdAt = new Date();
                    if ('CreatedAt' in properties && properties.CreatedAt.type === 'date' && properties.CreatedAt.date) {
                        createdAt = new Date(properties.CreatedAt.date.start);
                    }

                    let updatedAt = new Date();
                    if ('UpdatedAt' in properties && properties.UpdatedAt.type === 'date' && properties.UpdatedAt.date) {
                        updatedAt = new Date(properties.UpdatedAt.date.start);
                    }

                    if (url) {
                        links.push(new Bookmark(url, tag, description, '', createdAt, updatedAt));
                    }
                }

                hasMore = response.has_more;
                startCursor = response.next_cursor || undefined;
            }

            return links;
        } catch (error) {
            throw new Error(`Failed to retrieve all links from Notion: ${error instanceof Error ? error.message : error}`);
        }
    }

    async clear(): Promise<void> {
        // Note: Notion API doesn't support bulk delete
        // This would require archiving all pages individually
        console.warn('NotionLinkRepository.clear() is not implemented - Notion API does not support bulk deletion');
    }

    /**
     * Find a Notion page ID by URL using the new API structure
     */
    private async findPageIdByUrl(url: string): Promise<string | null> {
        try {
            const database = await this.client.databases.retrieve({
                database_id: this.databaseId,
            }) as DatabaseObjectResponse;

            if (database.object !== 'database' || !database.data_sources?.length) {
                return null;
            }

            // Query each data source for pages matching the URL
            for (const dataSource of database.data_sources) {
                const response = await (this.client as any).dataSources.query({
                    data_source_id: dataSource.id,
                    filter: {
                        property: 'Link',
                        title: {
                            equals: url,
                        },
                    },
                }) as QueryDataSourceResponse;

                if (response.results && response.results.length > 0) {
                    return response.results[0].id;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error finding page: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * Create a new Notion page
     */
    private async createPage(link: Bookmark): Promise<void> {
        await this.client.pages.create({
            parent: { database_id: this.databaseId },
            properties: {
                'Link': {
                    title: [
                        {
                            text: {
                                content: link.url,
                            },
                        },
                    ],
                },
                'Tag': {
                    multi_select: link.tag ? [{ name: link.tag }] : [],
                },
                'Description': {
                    rich_text: [
                        {
                            text: {
                                content: link.description || '',
                            },
                        },
                    ],
                },
                'CreatedAt': {
                    date: {
                        start: link.createdAt.toISOString(),
                    },
                },
                'UpdatedAt': {
                    date: {
                        start: link.updatedAt.toISOString(),
                    },
                },
            },
        });
    }

    /**
     * Update an existing Notion page
     */
    private async updatePage(pageId: string, link: Bookmark): Promise<void> {
        await this.client.pages.update({
            page_id: pageId,
            properties: {
                'Tag': {
                    multi_select: link.tag ? [{ name: link.tag }] : [],
                },
                'Description': {
                    rich_text: [
                        {
                            text: {
                                content: link.description || '',
                            },
                        },
                    ],
                },
                'UpdatedAt': {
                    date: {
                        start: new Date().toISOString(), // Always update timestamp
                    },
                },
            },
        });
    }
}
