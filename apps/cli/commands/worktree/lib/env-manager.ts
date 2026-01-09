import { join, dirname } from 'path';
import { mkdir } from 'fs/promises';
import type { PortConfig } from './types.js';
import { ENV_FILES } from './types.js';

/**
 * Manages .env file operations for worktrees
 */
export class EnvManager {
  constructor(
    private readonly sourceRoot: string,
    private readonly targetRoot: string
  ) {}

  /**
   * Copy all .env files from source to target worktree
   */
  async copyEnvFiles(): Promise<Array<string>> {
    const copied: Array<string> = [];

    for (const envFile of ENV_FILES) {
      const sourcePath = join(this.sourceRoot, envFile);
      const targetPath = join(this.targetRoot, envFile);

      try {
        const content = await Bun.file(sourcePath).text();
        await mkdir(dirname(targetPath), { recursive: true });
        await Bun.write(targetPath, content);
        copied.push(envFile);
      } catch {
        // File doesn't exist, skip
      }
    }

    return copied;
  }

  /**
   * Append port configuration to root .env
   */
  async appendPortConfig(ports: PortConfig, offset: number): Promise<void> {
    const envPath = join(this.targetRoot, '.env');

    const portConfig = `
# Worktree port configuration (offset: ${offset})
PORT_OFFSET=${offset}
API_PORT=${ports.apiPort}
API_URL=http://localhost:${ports.apiPort}
DASHBOARD_PORT=${ports.dashboardPort}
DASHBOARD_URL=http://localhost:${ports.dashboardPort}
TRADING_SERVER_PORT=${ports.tradingServerPort}
TRADING_SERVER_URL=http://localhost:${ports.tradingServerPort}
TRADING_CLIENT_PORT=${ports.tradingClientPort}
TRADING_CLIENT_URL=http://localhost:${ports.tradingClientPort}
`;

    const existing = await Bun.file(envPath)
      .text()
      .catch(() => '');
    await Bun.write(envPath, existing + portConfig);
  }

  /**
   * Update PORT and URL variables in app-specific .env files
   */
  async updateAppEnvFiles(ports: PortConfig): Promise<void> {
    // Update apps/api/.env
    await this.updateEnvFile(join(this.targetRoot, 'apps/api/.env'), {
      PORT: String(ports.apiPort),
      BETTER_AUTH_URL: `http://localhost:${ports.apiPort}`,
      CLIENT_URL: `http://localhost:${ports.dashboardPort}`,
    });

    // Update apps/trading/.env
    await this.updateEnvFile(join(this.targetRoot, 'apps/trading/.env'), {
      PORT: String(ports.tradingServerPort),
      CLIENT_URL: `http://localhost:${ports.tradingClientPort}`,
    });
  }

  /**
   * Update specific variables in an .env file
   */
  private async updateEnvFile(
    filePath: string,
    replacements: Record<string, string>
  ): Promise<void> {
    try {
      let content = await Bun.file(filePath).text();

      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`^${key}=.*$`, 'gm');
        if (content.match(regex)) {
          content = content.replace(regex, `${key}=${value}`);
        }
      }

      await Bun.write(filePath, content);
    } catch {
      // File doesn't exist, skip
    }
  }
}
