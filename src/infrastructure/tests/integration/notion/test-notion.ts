#!/usr/bin/env bun

import { Bookmark } from '../../../../domain/entities/Bookmark.js';
import { NotionLinkRepository } from '../../../repositories/NotionLinkRepository.js';
import { EnvConfig } from '../../../config/EnvConfig.js';

async function testNotion() {
    try {
        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const notionDatabaseId = config.get('NOTION_DATABASE_ID');

        // Create test links from the test CSV
        const testLinks = [
            new Bookmark(
                'https://x.com/heynina101/status/1985284315282907143?s=51&t=JsTxSwMxTXa9',
                'Social Media Post',
                'This appears to be a Twitter (X) post by a user with the handle @heynina101, shared on the social media platform.',
                'test'
            ),
            new Bookmark(
                'https://www.kompozite.io/blog/le-co2-equivalent-comprendre-limportance-de-lunite-de-mesure-des-ges',
                'Climate Impact Metrics',
                'This French-language article discusses the CO2 equivalent (CO2e) as a critical measurement unit for greenhouse gas emissions.',
                'test'
            ),
            new Bookmark(
                'http://albertapp.com/',
                'AI Business Assistant',
                'Albert is an artificial intelligence platform designed to help digital marketing and advertising professionals optimize their campaigns.',
                'test'
            ),
        ];

        console.log('🧪 Testing Notion integration with 3 test links...\n');

        const notionRepository = new NotionLinkRepository(notionToken, notionDatabaseId);
        await notionRepository.saveMany(testLinks);

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

testNotion();
