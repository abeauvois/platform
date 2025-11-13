import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse, QueryDataSourceResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { EmailLink } from '../../domain/entities/EmailLink.js';
import { INotionWriter } from '../../domain/ports/INotionWriter.js';

/**
 * Adapter: Implements Notion database writing using the Notion API
 */
export class NotionDatabaseWriter implements INotionWriter {
    private readonly client: Client;

    constructor(notionToken: string) {
        this.client = new Client({ auth: notionToken });
    }

    async write(links: EmailLink[], databaseId: string): Promise<void> {
        if (links.length === 0) {
            console.log('No links to export to Notion');
            return;
        }

        console.log(`Exporting ${links.length} links to Notion database...`);

        for (let i = 0; i < links.length; i++) {
            const link = links[i];

            try {
                await this.createPage(link, databaseId);
                console.log(`  [${i + 1}/${links.length}] ✓ ${link.url}`);
            } catch (error) {
                console.error(`  [${i + 1}/${links.length}] ✗ Failed to export ${link.url}:`, error instanceof Error ? error.message : error);
            }
        }

        console.log('Notion export complete!');
    }

    /**
     * Update existing Notion pages for specific URLs
     * @param links All links (with updated data)
     * @param databaseId Notion database ID
     * @param urlsToUpdate Set of URLs that should be updated
     */
    async updatePages(links: EmailLink[], databaseId: string, urlsToUpdate: Set<string>): Promise<void> {
        console.log("🚀 ~ NotionDatabaseWriter ~ updatePages ~ urlsToUpdate:", urlsToUpdate)
        if (urlsToUpdate.size === 0) {
            return;
        }

        console.log(`\n📝 Updating ${urlsToUpdate.size} Notion entries...`);

        let updated = 0;
        for (const link of links) {
            if (!urlsToUpdate.has(link.url)) {
                continue;
            }

            try {
                const pageId = await this.findPageByUrl(link.url, databaseId);
                if (pageId) {
                    await this.updatePage(pageId, link);
                    updated++;
                    console.log(`  ✓ Updated: ${link.url}`);
                } else {
                    console.log(`  ⚠️  Page not found for: ${link.url}`);
                }
            } catch (error) {
                console.error(`  ✗ Failed to update ${link.url}:`, error instanceof Error ? error.message : error);
            }
        }

        console.log(`✅ Notion updated (${updated} entries enriched)`);
    }

    /**
     * Find a Notion page by URL using the new API structure (Database → Data Sources → Pages)
     */
    private async findPageByUrl(url: string, databaseId: string): Promise<string | null> {
        try {
            // Step 1: Get the database and its data sources
            const database = await this.client.databases.retrieve({
                database_id: databaseId,
            }) as DatabaseObjectResponse;

            if (database.object !== 'database' || !database.data_sources?.length) {
                console.log('No data sources found in database');
                return null;
            }

            // Step 2: Query each data source for pages matching the URL
            // Note: Using 'any' for dataSources.query as the SDK client types don't expose this method yet
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

                // Step 3: Return the first matching page ID
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
     * Update an existing Notion page
     */
    private async updatePage(pageId: string, link: EmailLink): Promise<void> {
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
            },
        });
    }

    private async createPage(link: EmailLink, databaseId: string): Promise<void> {
        await this.client.pages.create({
            parent: { database_id: databaseId },
            properties: {
                // Link property (title) - capital L as in Notion database
                'Link': {
                    title: [
                        {
                            text: {
                                content: link.url,
                            },
                        },
                    ],
                },
                // Tag property (multi_select) - capital T as in Notion database
                'Tag': {
                    multi_select: link.tag ? [{ name: link.tag }] : [],
                },
                // Description property (rich_text) - capital D as in Notion database
                'Description': {
                    rich_text: [
                        {
                            text: {
                                content: link.description || '',
                            },
                        },
                    ],
                },
            },
        });
    }
}
