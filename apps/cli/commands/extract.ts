import { LinkExtractionFactory } from '../../../src/infrastructure/factories/LinkExtractionFactory.js';
import { WorkflowPresetName } from '../../../src/application/workflows/index.js';
import { loadConfig, createLogger } from '../lib/ConfigLoader';

export interface ExtractCommandOptions {
    verbose?: boolean;
    preset?: WorkflowPresetName;
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

        // Load configuration from API
        console.log('⚙️  Loading configuration from API...');
        const config = await loadConfig();
        console.log('✅ Configuration loaded\n');

        // Create factory and build workflow
        const factory = new LinkExtractionFactory(config, logger);

        const workflow = preset
            ? factory.createPreset(preset)
            : factory.builder()
                .extract()
                .when(!skipAnalysis, b => b.analyze())
                .when(!skipTwitter && !skipAnalysis, b => b.enrichTwitter().withRetry())
                .exportTo({ csv: true, notion: !csvOnly })
                .build();

        // Execute workflow
        await workflow.execute(inputPath, outputCsvPath);

        console.log('\n✨ Success! Your links have been extracted and categorized.\n');
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
