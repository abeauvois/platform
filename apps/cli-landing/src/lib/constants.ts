export const CLI_VERSION = '0.0.2'

export const INSTALL_COMMANDS = {
  curl: 'curl -fsSL https://raw.githubusercontent.com/abeauvois/platform/main/apps/cli/install.sh | bash',
  npm: 'npm install -g platform-cli-tool',
}

export const BINARIES = [
  { os: 'macos', arch: 'arm64', label: 'macOS (Apple Silicon)', file: 'platform-macos-arm64' },
  { os: 'macos', arch: 'x64', label: 'macOS (Intel)', file: 'platform-macos-x64' },
  { os: 'linux', arch: 'x64', label: 'Linux (x64)', file: 'platform-linux-x64' },
  { os: 'linux', arch: 'arm64', label: 'Linux (ARM64)', file: 'platform-linux-arm64' },
  { os: 'windows', arch: 'x64', label: 'Windows (x64)', file: 'platform-windows-x64.exe' },
] as const

export const GITHUB_RELEASES_URL = 'https://github.com/abeauvois/platform/releases/latest/download'
export const GITHUB_REPO_URL = 'https://github.com/abeauvois/platform'
export const NPM_PACKAGE_URL = 'https://npmjs.com/package/platform-cli-tool'
