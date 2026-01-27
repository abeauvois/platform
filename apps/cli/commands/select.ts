import * as p from '@clack/prompts';
import { CsvFileWriter } from '../adapters/CsvFileWriter';
import { Bookmark } from '@abeauvois/platform-domain';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

/**
 * Select command - Interactive link selection using clack
 * Allows users to visually select links for further processing
 */
export async function selectCommand(inputCsv?: string) {
    p.intro('🎯 Link Selection');

    try {
        // Determine input file
        const csvPath = inputCsv || await p.text({
            message: 'Path to your CSV file with links',
            placeholder: 'output.csv',
            initialValue: 'output.csv',
            validate(value) {
                if (!value || value.length === 0) return 'CSV path is required';
            }
        }) as string;

        if (p.isCancel(csvPath)) {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }

        // Read and parse CSV
        p.log.info(`Reading links from ${csvPath}...`);

        let links: Bookmark[];
        try {
            const csvContent = readFileSync(csvPath, 'utf-8');
            const records = parse(csvContent, {
                columns: true,
                skip_empty_lines: true
            });

            links = records.map((record: any) => new Bookmark(
                record.url || record.link, // Handle both 'url' and 'link' column names
                record.userId || 'cli-user',
                record.sourceAdapter || 'Other',
                record.tags ? JSON.parse(record.tags) : [],
                record.summary || record.description || '',
                record.rawContent || '',
                record.createdAt ? new Date(record.createdAt) : new Date(),
                record.updatedAt ? new Date(record.updatedAt) : new Date(),
                record.contentType || 'unknown'
            ));

            p.log.success(`Found ${links.length} links`);
        } catch (error) {
            p.log.error(`Failed to read CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
            p.outro('❌ Selection cancelled');
            process.exit(1);
        }

        if (links.length === 0) {
            p.log.warn('No links found in CSV file');
            p.outro('Nothing to select');
            process.exit(0);
        }

        // Group links by first tag for better organization
        const linksByTag = links.reduce((acc, link) => {
            const tag = link.tags[0] || 'untagged';
            if (!acc[tag]) {
                acc[tag] = [];
            }
            acc[tag].push(link);
            return acc;
        }, {} as Record<string, Bookmark[]>);

        // Show selection mode options
        const selectionMode = await p.select({
            message: 'How would you like to select links?',
            options: [
                { value: 'by-link', label: 'Select individual links' },
                { value: 'by-tag', label: 'Select by tag/category' },
                { value: 'all', label: 'Select all links' }
            ]
        });

        if (p.isCancel(selectionMode)) {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }

        let selectedLinks: Bookmark[] = [];

        if (selectionMode === 'all') {
            selectedLinks = links;
            p.log.success(`Selected all ${selectedLinks.length} links`);
        } else if (selectionMode === 'by-tag') {
            // Select by tags
            const selectedTags = await p.multiselect({
                message: 'Select tags/categories to include',
                options: Object.keys(linksByTag).map(tag => ({
                    value: tag,
                    label: `${tag} (${linksByTag[tag].length} links)`
                })),
                required: true
            });

            if (p.isCancel(selectedTags)) {
                p.cancel('Operation cancelled.');
                process.exit(0);
            }

            selectedLinks = (selectedTags as string[]).flatMap(tag => linksByTag[tag]);
            p.log.success(`Selected ${selectedLinks.length} links from ${(selectedTags as string[]).length} categories`);
        } else {
            // Select individual links with grouped display
            const selectedIndices = await p.groupMultiselect({
                message: 'Select links (Space to select, Enter to confirm)',
                options: Object.fromEntries(
                    Object.entries(linksByTag).map(([tag, tagLinks]) => [
                        tag,
                        tagLinks.map((link, index) => {
                            let hostname = 'unknown';
                            try {
                                if (link.url) {
                                    hostname = new URL(link.url).hostname;
                                }
                            } catch (e) {
                                // Invalid URL, keep default hostname
                            }
                            return {
                                value: links.indexOf(link),
                                label: truncateText(link.summary || link.url || 'No description', 60),
                                hint: hostname
                            };
                        })
                    ])
                ),
                required: true
            });

            if (p.isCancel(selectedIndices)) {
                p.cancel('Operation cancelled.');
                process.exit(0);
            }

            selectedLinks = (selectedIndices as number[]).map(i => links[i]);
            p.log.success(`Selected ${selectedLinks.length} links`);
        }

        // Display selected links with checkboxes and truncated URLs
        p.note(
            selectedLinks.map((link, i) =>
                `☑ [${link.tags[0] || 'untagged'}] ${truncateText(link.summary || link.url, 60)}\n   ${truncateText(link.url, 80)}`
            ).join('\n\n'),
            `Selected ${selectedLinks.length} link${selectedLinks.length === 1 ? '' : 's'}`
        );

        // Ask what to do with selected links
        const action = await p.select({
            message: 'What would you like to do with selected links?',
            options: [
                { value: 'export', label: 'Export to new CSV file' },
                { value: 'display', label: 'Display in terminal' },
                { value: 'copy', label: 'Copy URLs to clipboard' }
            ]
        });

        if (p.isCancel(action)) {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }

        // Execute the selected action
        if (action === 'export') {
            const outputPath = await p.text({
                message: 'Output CSV filename',
                placeholder: 'selected-links.csv',
                initialValue: 'selected-links.csv'
            });

            if (p.isCancel(outputPath)) {
                p.cancel('Operation cancelled.');
                process.exit(0);
            }

            const spinner = p.spinner();
            spinner.start('Exporting selected links...');

            const writer = new CsvFileWriter();
            await writer.write(selectedLinks, outputPath as string);

            spinner.stop(`Exported ${selectedLinks.length} links to ${outputPath}`);
        } else if (action === 'display') {
            console.log('\n📋 Selected Links:\n');
            selectedLinks.forEach((link, i) => {
                console.log(`${i + 1}. [${link.tags[0] || 'untagged'}] ${link.summary || link.url}`);
                console.log(`   🔗 ${link.url}`);
                if (i < selectedLinks.length - 1) console.log('');
            });
        } else if (action === 'copy') {
            const urls = selectedLinks.map(l => l.url).join('\n');
            // Note: Actual clipboard copy would need a library like clipboardy
            console.log('\n📋 URLs (copy manually):\n');
            console.log(urls);
            p.log.info('💡 Tip: Install clipboardy package for automatic clipboard copy');
        }

        p.outro('✨ Selection complete!');
    } catch (error) {
        p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        p.outro('❌ Selection failed');
        process.exit(1);
    }
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
