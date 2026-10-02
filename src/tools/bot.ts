import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { parsePermissionsInput } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { OAuth2Scopes, PermissionFlagsBits } from 'discord.js';

export function registerBotTools(server: McpServer): void {
  server.tool(
    'get_bot_info',
    'Get current bot application status, username, ping, server count, and uptime',
    {},
    async () => {
      try {
        const client = await getDiscordClient();
        if (!client.user) {
          return { content: [{ type: 'text', text: 'Bot client is not ready.' }] };
        }

        const uptimeMinutes = Math.floor((client.uptime || 0) / 60000);
        const lines = [
          `**Bot Tag:** ${client.user.tag}`,
          `**Bot ID:** \`${client.user.id}\``,
          `**Servers Connected:** ${client.guilds.cache.size}`,
          `**Gateway Ping:** ${client.ws.ping} ms`,
          `**Uptime:** ${uptimeMinutes} minutes`,
          `**Verified:** ${client.user.verified}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get bot info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'generate_bot_invite_url',
    'Generate an official OAuth2 invite link to add a bot or application to a server with custom permissions',
    {
      clientId: z.string().optional().describe('Bot / Application client ID (defaults to this bot\'s ID)'),
      permissionsRaw: z.string().optional().describe('Raw permissions bitfield string (e.g. "8" for Administrator)'),
      permissionsCsv: z.string().optional().describe('CSV of permission names (e.g. ViewChannel,SendMessages,ManageChannels)'),
      scopesCsv: z.string().default('bot,applications.commands').describe('Comma-separated OAuth2 scopes (default: "bot,applications.commands")'),
      guildId: z.string().optional().describe('Pre-select a specific server ID in the invite authorization flow'),
    },
    async ({ clientId, permissionsRaw, permissionsCsv, scopesCsv, guildId }) => {
      try {
        const client = await getDiscordClient();
        const targetClientId = clientId || client.user?.id;
        if (!targetClientId) {
          return { content: [{ type: 'text', text: 'Could not determine bot client ID.' }] };
        }

        const permissions = parsePermissionsInput(permissionsRaw, permissionsCsv);
        const scopes = scopesCsv.split(',').map((s) => s.trim());

        const url = (typeof client.generateInvite === 'function')
          ? client.generateInvite({
              scopes,
              permissions: permissions.bitfield,
              guild: guildId || undefined,
            })
          : `https://discord.com/oauth2/authorize?client_id=${targetClientId}&scope=${encodeURIComponent(scopes.join('%20'))}&permissions=${permissions.bitfield.toString()}${guildId ? `&guild_id=${guildId}` : ''}`;

        return {
          content: [{
            type: 'text',
            text: `**Bot Authorization Invite URL:**\n${url}\n\n- Client ID: \`${targetClientId}\`\n- Scopes: ${scopesCsv}\n- Permissions: ${permissions.bitfield.toString()}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to generate bot invite URL: ${formatError(err)}` }] };
      }
    }
  );
}
