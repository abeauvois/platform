import { Terminal, Github, Package } from 'lucide-react'
import { GITHUB_REPO_URL, NPM_PACKAGE_URL } from '@/lib/constants'

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-base-300/80 border-b border-base-content/10">
      <nav className="navbar max-w-6xl mx-auto px-4">
        <div className="navbar-start">
          <a href="/" className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            <span className="font-mono font-bold text-lg">platform-cli</span>
          </a>
        </div>
        <div className="navbar-end gap-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="GitHub repository"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href={NPM_PACKAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="npm package"
          >
            <Package className="w-5 h-5" />
          </a>
        </div>
      </nav>
    </header>
  )
}
