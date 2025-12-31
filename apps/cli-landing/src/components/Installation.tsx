import { useState } from 'react'
import { Terminal, Package, Download, CheckCircle } from 'lucide-react'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'
import { CopyButton } from './CopyButton'
import { INSTALL_COMMANDS, BINARIES, GITHUB_RELEASES_URL } from '@/lib/constants'

type InstallMethod = 'curl' | 'npm' | 'binary'

export function Installation() {
  const [activeMethod, setActiveMethod] = useState<InstallMethod>('curl')
  const { platform, arch } = usePlatformDetection()

  return (
    <section className="py-20 px-4" id="install">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Installation</h2>
        <p className="text-center text-base-content/70 mb-8">
          Choose your preferred installation method
        </p>

        {/* Tab Navigation */}
        <div
          role="tablist"
          className="tabs tabs-boxed bg-base-200 max-w-md mx-auto mb-8 p-1"
        >
          <button
            role="tab"
            className={`tab gap-2 ${activeMethod === 'curl' ? 'tab-active' : ''}`}
            onClick={() => setActiveMethod('curl')}
          >
            <Terminal className="w-4 h-4" />
            Curl
          </button>
          <button
            role="tab"
            className={`tab gap-2 ${activeMethod === 'npm' ? 'tab-active' : ''}`}
            onClick={() => setActiveMethod('npm')}
          >
            <Package className="w-4 h-4" />
            npm
          </button>
          <button
            role="tab"
            className={`tab gap-2 ${activeMethod === 'binary' ? 'tab-active' : ''}`}
            onClick={() => setActiveMethod('binary')}
          >
            <Download className="w-4 h-4" />
            Binary
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-base-100 rounded-lg p-6 shadow-lg">
          {activeMethod === 'curl' && (
            <InstallTab
              title="Quick Install via Curl"
              description="Automatically detects your platform and installs the appropriate binary."
              command={INSTALL_COMMANDS.curl}
            />
          )}
          {activeMethod === 'npm' && (
            <InstallTab
              title="Install via npm"
              description="Requires Node.js 18+ or Bun runtime."
              command={INSTALL_COMMANDS.npm}
            />
          )}
          {activeMethod === 'binary' && (
            <BinaryDownloads platform={platform} arch={arch} />
          )}
        </div>
      </div>
    </section>
  )
}

interface InstallTabProps {
  title: string
  description: string
  command: string
}

function InstallTab({ title, description, command }: InstallTabProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-base-content/70 text-sm mb-4">{description}</p>

      <div className="bg-neutral rounded-lg p-4 font-mono text-sm">
        <div className="flex items-center justify-between gap-4">
          <code className="text-success overflow-x-auto whitespace-nowrap">
            <span className="text-primary">$ </span>
            {command}
          </code>
          <CopyButton text={command} className="text-neutral-content" />
        </div>
      </div>
    </div>
  )
}

interface BinaryDownloadsProps {
  platform: string
  arch: string
}

function BinaryDownloads({ platform, arch }: BinaryDownloadsProps) {
  const currentBinary = BINARIES.find((b) => b.os === platform && b.arch === arch)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Direct Binary Downloads</h3>
      <p className="text-base-content/70 text-sm mb-4">
        Download the binary for your platform and add it to your PATH.
      </p>

      {currentBinary && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span>
              Detected: <strong>{currentBinary.label}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {BINARIES.map((binary) => (
          <a
            key={binary.file}
            href={`${GITHUB_RELEASES_URL}/${binary.file}`}
            className={`btn btn-outline btn-sm justify-start gap-2 ${
              currentBinary?.file === binary.file ? 'btn-primary' : ''
            }`}
          >
            <Download className="w-4 h-4" />
            {binary.label}
          </a>
        ))}
      </div>
    </div>
  )
}
