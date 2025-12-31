import { Terminal } from 'lucide-react'
import { CLI_VERSION, GITHUB_REPO_URL, NPM_PACKAGE_URL } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="bg-base-300 border-t border-base-content/10 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-mono font-bold">platform-cli</span>
            <span className="badge badge-sm badge-ghost">v{CLI_VERSION}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-base-content/70">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
            <a
              href={NPM_PACKAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              npm
            </a>
            <a
              href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              MIT License
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
