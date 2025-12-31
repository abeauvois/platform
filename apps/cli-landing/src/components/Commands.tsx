import { CommandBlock } from './CommandBlock'

const COMMANDS = [
  {
    title: 'List Gmail Messages',
    description: 'Read recent emails with optional filtering',
    command: 'platform list source gmail --filter=newsletter@example.com --limit-days=7',
    output: `Gmail Source read
Configuration:
  Filter: newsletter@example.com
  Limit: 7 days
Found 15 messages`,
  },
  {
    title: 'Ingest with URLs',
    description: 'Process emails containing links for bookmark extraction',
    command: 'platform ingest source gmail --with-url --save-to=bookmarks',
    output: `Starting ingestion workflow...
Fetching Gmail messages...
Found 12 messages with URLs
Processing bookmarks...
Ingestion completed successfully!`,
  },
  {
    title: 'Interactive Selection',
    description: 'Select and export links from CSV files',
    command: 'platform select',
    output: `Link Selection
Reading links from output.csv...
Found 42 links
Select by: individual links | tag/category | all`,
  },
]

export function Commands() {
  return (
    <section className="py-20 px-4 bg-base-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Command Reference</h2>
        <p className="text-center text-base-content/70 mb-12">
          Explore what you can do with platform-cli
        </p>

        <div className="space-y-6">
          {COMMANDS.map((cmd, index) => (
            <CommandBlock key={index} {...cmd} />
          ))}
        </div>
      </div>
    </section>
  )
}
