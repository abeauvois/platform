import { usePlatformDetection } from '@/hooks/usePlatformDetection'
import { AnimatedTerminal } from './AnimatedTerminal'
import { CopyButton } from './CopyButton'
import { PlatformBadge } from './PlatformBadge'
import { CLI_VERSION } from '@/lib/constants'

export function Hero() {
  const { platform, osLabel, installCommand } = usePlatformDetection()

  return (
    <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        {/* Version Badge */}
        <div className="badge badge-outline badge-primary mb-6 font-mono">
          v{CLI_VERSION}
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Your data.{' '}
          <span className="text-primary">Your terminal.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-base-content/70 mb-10 max-w-2xl mx-auto">
          Ingest data from Gmail, manage bookmarks, and run workflows —
          all from the command line.
        </p>

        {/* Animated Terminal Demo */}
        <div className="mb-10">
          <AnimatedTerminal />
        </div>

        {/* Primary CTA - Install Command */}
        <div className="bg-base-200 rounded-lg p-4 max-w-2xl mx-auto mb-4">
          <div className="flex items-center justify-between gap-4">
            <PlatformBadge platform={platform} osLabel={osLabel} />
            <code className="font-mono text-xs sm:text-sm text-primary flex-grow text-left overflow-x-auto whitespace-nowrap">
              {installCommand}
            </code>
            <CopyButton text={installCommand} />
          </div>
        </div>

        <p className="text-sm text-base-content/50">
          or{' '}
          <a href="#install" className="link link-primary">
            scroll down
          </a>{' '}
          for more installation options
        </p>
      </div>
    </section>
  )
}
