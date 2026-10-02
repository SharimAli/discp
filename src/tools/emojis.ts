import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerEmojiTools(server: McpServer): void {
  server.tool(
    'list_emojis',
    'List all custom emojis uploaded to the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const emojis = await guild.emojis.fetch();
        if (emojis.size === 0) {
          return { content: [{ type: 'text', text: `No custom emojis found on ${guild.name}.` }] };
        }

        const lines = emojis.map((e) => `- <${e.animated ? 'a' : ''}:${e.name}:${e.id}> **${e.name}** (ID: \`${e.id}\`, Animated: ${e.animated})`);
        return { content: [{ type: 'text', text: `**Custom Emojis in ${guild.name} (${emojis.size}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list emojis: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_emoji_details',
    'Get details about a specific custom emoji',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      emojiId: z.string().describe('Emoji ID'),
    },
    async ({ guildId, emojiId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const emoji = await guild.emojis.fetch(emojiId);
        const roles = emoji.roles.cache.map((r) => r.name).join(', ') || 'All roles';

        const lines = [
          `**Name:** :${emoji.name}:`,
          `**ID:** \`${emoji.id}\``,
          `**Animated:** ${emoji.animated}`,
          `**URL:** ${emoji.imageURL()}`,
          `**Restricted to roles:** ${roles}`,
          `**Created:** ${emoji.createdAt.toISOString()}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get emoji details: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_emoji',
    'Upload a new custom emoji to the server from an image URL or base64 data URI (max 256KB)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Emoji name (alphanumeric and underscores)'),
      attachmentUrlOrBase64: z.string().describe('Direct image URL or base64 data URI (e.g. data:image/png;base64,...)'),
      rolesCsv: z.string().optional().describe('Comma-separated role IDs permitted to use emoji'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, attachmentUrlOrBase64, rolesCsv, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const roles = rolesCsv ? rolesCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const emoji = await guild.emojis.create({
          name,
          attachment: attachmentUrlOrBase64,
          roles,
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Successfully created emoji :${emoji.name}: (ID: \`${emoji.id}\`). URL: ${emoji.imageURL()}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create emoji: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_emoji',
    'Edit custom emoji name or restricted roles',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      emojiId: z.string().describe('Emoji ID'),
      name: z.string().optional().describe('New name'),
      rolesCsv: z.string().optional().describe('Comma-separated role IDs (empty string to allow all)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, emojiId, name, rolesCsv, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const emoji = await guild.emojis.fetch(emojiId);

        const roles = rolesCsv !== undefined ? (rolesCsv === '' ? [] : rolesCsv.split(',').map((s) => s.trim())) : undefined;
        await emoji.edit({
          name: name || undefined,
          roles,
          reason,
        });

        return { content: [{ type: 'text', text: `Updated emoji :${emoji.name}: (ID: \`${emojiId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit emoji: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_emoji',
    'Permanently delete a custom emoji from the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      emojiId: z.string().describe('Emoji ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, emojiId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const emoji = await guild.emojis.fetch(emojiId);

        const name = emoji.name;
        await emoji.delete(reason);
        return { content: [{ type: 'text', text: `Successfully deleted emoji :${name}: (\`${emojiId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete emoji: ${formatError(err)}` }] };
      }
    }
  );
}
