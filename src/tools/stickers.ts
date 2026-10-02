import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerStickerTools(server: McpServer): void {
  server.tool(
    'list_stickers',
    'List all custom stickers available on the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const stickers = await guild.stickers.fetch();
        if (stickers.size === 0) {
          return { content: [{ type: 'text', text: `No custom stickers found on ${guild.name}.` }] };
        }

        const lines = stickers.map((s) => `- **${s.name}** (ID: \`${s.id}\`, Tags: "${s.tags}"): ${s.url}`);
        return { content: [{ type: 'text', text: `**Custom Stickers on ${guild.name} (${stickers.size}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list stickers: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_sticker_details',
    'Get details about a specific custom sticker',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      stickerId: z.string().describe('Sticker ID'),
    },
    async ({ guildId, stickerId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const sticker = await guild.stickers.fetch(stickerId);
        const lines = [
          `**Name:** ${sticker.name}`,
          `**ID:** \`${sticker.id}\``,
          `**Description:** ${sticker.description || 'None'}`,
          `**Tags (related emoji):** ${sticker.tags}`,
          `**Format:** ${sticker.format}`,
          `**URL:** ${sticker.url}`,
          `**Created:** ${sticker.createdAt.toISOString()}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get sticker details: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_sticker',
    'Upload a new custom sticker to the server (PNG or APNG, max 512KB, exactly 320x320 pixels)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Sticker name (2-30 characters)'),
      description: z.string().optional().describe('Sticker description'),
      tags: z.string().describe('Autocomplete/related emoji name for this sticker'),
      fileUrlOrBase64: z.string().describe('File image URL or base64 data URI of the sticker image'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, description, tags, fileUrlOrBase64, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const sticker = await guild.stickers.create({
          name,
          description: description || undefined,
          tags,
          file: fileUrlOrBase64,
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Successfully created sticker: **${sticker.name}** (ID: \`${sticker.id}\`). URL: ${sticker.url}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create sticker: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_sticker',
    'Permanently delete a custom sticker from the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      stickerId: z.string().describe('Sticker ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, stickerId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const sticker = await guild.stickers.fetch(stickerId);

        const name = sticker.name;
        await sticker.delete(reason);
        return { content: [{ type: 'text', text: `Successfully deleted sticker: **${name}** (\`${stickerId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete sticker: ${formatError(err)}` }] };
      }
    }
  );
}
