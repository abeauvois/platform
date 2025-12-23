import { PlatformApiClient } from '@platform/sdk';
import { createLogger } from '../lib/ConfigLoader';

export interface ExtractCommandOptions {
    verbose?: boolean;
    preset?: WorkflowPreset;
    skipAnalysis?: boolean;
    skipTwitter?: boolean;
    csvOnly?: boolean;
}

export async function extractCommand(
    inputPath?: string,
    outputCsvPath: string = 'output.csv',
    options: ExtractCommandOptions = {}
) {
    const { verbose = false, preset, skipAnalysis, skipTwitter, csvOnly } = options;
    const logger = createLogger();

    try {
        if (!inputPath) {
            console.error('❌ Error: input-path is required');
            console.error('\nUsage: bun run cli extract <input-path> [output-csv] [options]\n');
            console.error('Options:');
            console.error('  --preset <name>     Use a preset workflow (full|quick|analyzeOnly|twitterFocus|csvOnly)');
            console.error('  --skip-analysis     Skip AI analysis step');
            console.error('  --skip-twitter      Skip Twitter enrichment');
            console.error('  --csv-only          Export to CSV only (no Notion)');
            console.error('  --verbose           Show detailed output\n');
            process.exit(1);
        }

        console.log('🚀 Email Link Extractor\n');
        console.log(`📥 Input:  ${inputPath}`);
        console.log(`📤 Output: ${outputCsvPath}`);

        if (preset) {
            console.log(`📋 Preset: ${preset}`);
        }
        if (verbose) {
            console.log(`🔊 Verbose: enabled`);
        }
        console.log();

        const platformClient = new PlatformApiClient({
            baseUrl: "http://localhost:3000/api",
            logger
        })

        const workflow = platformClient.ingest(workflowPreset: preset, {
            filter: {
                email: "abeauvois@gmail.com"
            },
            skipAnalysis,
            skipTwitter
        })

        workflow.execute({
            onStart: ({ logger }) => logger.info('started'),
            onError: ({ logger }) => logger.error('an error occured'),
            onComplete: ({ logger }) => logger.info('\n✨ Success! Your links have been extracted and categorized.\n'),
        })

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        if (verbose && error instanceof Error) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        console.error('\nFor help, run: bun run cli --help\n');
        process.exit(1);
    }
}
