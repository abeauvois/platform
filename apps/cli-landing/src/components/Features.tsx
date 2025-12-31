import { Mail, Bookmark, Workflow } from 'lucide-react'
import { FeatureCard } from './FeatureCard'

const FEATURES = [
  {
    icon: Mail,
    title: 'Gmail Integration',
    description:
      'Read and ingest emails directly from your Gmail account. Filter by sender, date range, or presence of URLs.',
    command: 'platform list source gmail',
  },
  {
    icon: Bookmark,
    title: 'Bookmark Management',
    description:
      'Organize and export bookmarks from various sources. Tag, filter, and select links interactively.',
    command: 'platform select',
  },
  {
    icon: Workflow,
    title: 'Workflow Automation',
    description:
      'Run background workflows for data processing, analysis, and enrichment tasks.',
    command: 'platform ingest source gmail',
  },
]

export function Features() {
  return (
    <section className="py-20 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything you need in your terminal
        </h2>
        <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
          A powerful CLI for managing your personal data with simple, intuitive commands.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
