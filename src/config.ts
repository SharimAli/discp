import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  get discordToken(): string;
  defaultGuildId?: string;
  transport: 'stdio' | 'http';
  port: number;
  accountType: 'user' | 'bot';
}

function resolveToken(): string {
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim() !== '') {
    return process.env.DISCORD_TOKEN.trim();
  }
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DISCORD_TOKEN=(.*)/);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }
  const mcpConfigPath = 'C:\\Users\\whoami\\.gemini\\config\\mcp_config.json';
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      const token = parsed?.mcpServers?.discp?.env?.DISCORD_TOKEN;
      if (token && typeof token === 'string' && token.trim() !== '') {
        return token.trim();
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  return '';
}

export const config = {
  get discordToken(): string {
    return resolveToken();
  },
  defaultGuildId: process.env.DISCORD_GUILD_ID || undefined,
  transport: (process.env.MCP_TRANSPORT === 'http' || process.env.SPRING_PROFILES_ACTIVE === 'http')
    ? 'http'
    : 'stdio',
  port: parseInt(process.env.PORT || '8085', 10),
  // Defaults to 'user' account mode so personal/alt user tokens work without developer portal setup!
  accountType: (process.env.ACCOUNT_TYPE === 'bot') ? 'bot' : 'user',
};

export function validateConfig(): void {
  if (!config.discordToken) {
    console.error('[Discp] NOTICE: DISCORD_TOKEN is not set. Tools will return a configuration prompt until DISCORD_TOKEN is set in mcp_config.json or .env.');
  }
}
