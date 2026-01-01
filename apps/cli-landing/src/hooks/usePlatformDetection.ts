import { useEffect, useState } from 'react'
import { INSTALL_COMMANDS } from '@/lib/constants'

export interface PlatformInfo {
  platform: 'macos' | 'linux' | 'windows' | 'unknown'
  arch: 'arm64' | 'x64' | 'unknown'
  osLabel: string
  installCommand: string
}

export function usePlatformDetection(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>({
    platform: 'unknown',
    arch: 'unknown',
    osLabel: 'Your Platform',
    installCommand: INSTALL_COMMANDS.curl,
  })

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform?.toLowerCase() || ''

    let detectedPlatform: PlatformInfo['platform'] = 'unknown'
    let detectedArch: PlatformInfo['arch'] = 'unknown'
    let osLabel = 'Your Platform'

    // Detect OS
    if (platform.includes('mac') || userAgent.includes('mac')) {
      detectedPlatform = 'macos'
      osLabel = 'macOS'
    } else if (platform.includes('win') || userAgent.includes('win')) {
      detectedPlatform = 'windows'
      osLabel = 'Windows'
    } else if (platform.includes('linux') || userAgent.includes('linux')) {
      detectedPlatform = 'linux'
      osLabel = 'Linux'
    }

    // Default architecture assumptions
    if (detectedPlatform === 'macos') {
      detectedArch = 'arm64' // Assume Apple Silicon for newer Macs
    } else {
      detectedArch = 'x64' // Default assumption
    }

    setInfo({
      platform: detectedPlatform,
      arch: detectedArch,
      osLabel,
      installCommand: INSTALL_COMMANDS.curl,
    })

    // Try to detect architecture more precisely
    if ('userAgentData' in navigator) {
      const nav = navigator as Navigator & {
        userAgentData?: {
          getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }>
        }
      }
      nav.userAgentData
        ?.getHighEntropyValues?.(['architecture'])
        .then((data) => {
          if (data.architecture === 'arm') {
            setInfo((prev) => ({
              ...prev,
              arch: 'arm64',
            }))
          } else if (data.architecture === 'x86') {
            setInfo((prev) => ({
              ...prev,
              arch: 'x64',
            }))
          }
        })
        .catch(() => {
          // Ignore errors, use default detection
        })
    }
  }, [])

  return info
}
