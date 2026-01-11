import { join } from 'path';
import { homedir, platform } from 'os';
import { mkdir, unlink } from 'fs/promises';
import type { PortConfig, WarpLaunchConfig } from './types.js';

/**
 * Generate and launch Warp terminal tabs for a worktree
 */
export class WarpLauncher {
  private readonly configDir: string;

  constructor() {
    // Warp config directory varies by platform
    const os = platform();
    if (os === 'darwin') {
      this.configDir = join(homedir(), '.warp', 'launch_configurations');
    } else if (os === 'linux') {
      const xdgData =
        process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
      this.configDir = join(xdgData, 'warp-terminal', 'launch_configurations');
    } else {
      // Windows or unsupported - best effort
      this.configDir = join(
        process.env.APPDATA || homedir(),
        'warp',
        'Warp',
        'data',
        'launch_configurations'
      );
    }
  }

  /**
   * Generate YAML for a worktree development environment
   */
  generateConfig(
    worktreePath: string,
    name: string,
    ports: PortConfig
  ): string {
    const config: WarpLaunchConfig = {
      name: `platform-${name}`,
      windows: [
        {
          tabs: [
            {
              title: `API :${ports.apiPort}`,
              color: 'Blue',
              layout: {
                cwd: worktreePath,
                commands: [{ exec: `PORT=${ports.apiPort} bun run api` }],
              },
            },
            {
              title: `Dashboard :${ports.dashboardPort}`,
              color: 'Green',
              layout: {
                cwd: worktreePath,
                commands: [{ exec: `PORT=${ports.dashboardPort} bun run dashboard` }],
              },
            },
            {
              title: `Trading :${ports.tradingServerPort}`,
              color: 'Yellow',
              layout: {
                cwd: worktreePath,
                commands: [{ exec: `PORT=${ports.tradingServerPort} bun run trading:server` }],
              },
            },
          ],
        },
      ],
    };

    return this.toYaml(config);
  }

  /**
   * Write config file and launch Warp
   */
  async launchWorktree(
    worktreePath: string,
    name: string,
    ports: PortConfig
  ): Promise<{ configPath: string; configName: string }> {
    const configName = `platform-worktree-${name}.yaml`;
    const configPath = join(this.configDir, configName);

    // Ensure config directory exists
    await mkdir(this.configDir, { recursive: true });

    // Generate and write config
    const yaml = this.generateConfig(worktreePath, name, ports);
    await Bun.write(configPath, yaml);

    // Open Warp at the worktree directory
    // Note: warp://launch/ URI scheme and JXA automation are unreliable
    // So we open Warp at the directory and let user trigger the launch config
    const os = platform();
    if (os === 'darwin') {
      // Open a new Warp tab at the worktree directory
      const proc = Bun.spawn(['open', `warp://action/new_window?path=${worktreePath}`], {
        stdout: 'ignore',
        stderr: 'ignore',
      });
      await proc.exited;
    } else if (os === 'linux') {
      const proc = Bun.spawn(['xdg-open', `warp://action/new_window?path=${worktreePath}`], {
        stdout: 'ignore',
        stderr: 'ignore',
      });
      await proc.exited;
    }
    // Windows not supported for auto-launch

    return { configPath, configName: `platform-${name}` };
  }

  /**
   * Get the launch config name for a worktree (used for display)
   */
  getConfigName(name: string): string {
    return `platform-${name}`;
  }

  /**
   * Clean up a launch configuration file
   */
  async cleanup(name: string): Promise<void> {
    const configPath = join(this.configDir, `platform-worktree-${name}.yaml`);
    try {
      await unlink(configPath);
    } catch {
      // Ignore cleanup errors (file may not exist)
    }
  }

  /**
   * Get the platform type for display purposes
   */
  getPlatform(): 'darwin' | 'linux' | 'windows' | 'unknown' {
    const os = platform();
    if (os === 'darwin') return 'darwin';
    if (os === 'linux') return 'linux';
    if (os === 'win32') return 'windows';
    return 'unknown';
  }

  /**
   * Check if auto-launch is supported on this platform
   */
  isAutoLaunchSupported(): boolean {
    const os = platform();
    return os === 'darwin' || os === 'linux';
  }

  /**
   * Convert config object to YAML string
   * Simple YAML serialization for the specific structure we need
   */
  private toYaml(config: WarpLaunchConfig): string {
    const lines: Array<string> = ['---'];
    lines.push(`name: ${config.name}`);
    lines.push('windows:');

    for (const window of config.windows) {
      lines.push('  - tabs:');
      for (const tab of window.tabs) {
        lines.push(`      - title: "${tab.title}"`);
        if (tab.color) {
          lines.push(`        color: ${tab.color}`);
        }
        lines.push('        layout:');
        lines.push(`          cwd: "${tab.layout.cwd}"`);
        if (tab.layout.commands && tab.layout.commands.length > 0) {
          lines.push('          commands:');
          for (const cmd of tab.layout.commands) {
            lines.push(`            - exec: "${cmd.exec}"`);
          }
        }
      }
    }

    return lines.join('\n') + '\n';
  }
}
