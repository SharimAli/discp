import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerFormattingTools(server: McpServer): void {
  server.tool(
    'format_discord_mention',
    'Generate proper Discord Markdown mentions and shortcuts for users, roles, channels, timestamps, custom emojis, and slash commands',
    {
      type: z.enum(['user', 'role', 'channel', 'timestamp', 'custom_emoji', 'slash_command', 'special_tab'])
        .describe('Type of mention/shortcut to format'),
      id: z.string().describe('Target ID (User ID, Role ID, Channel ID, Unix Timestamp, Emoji ID, or Command ID)'),
      style: z.enum(['t', 'T', 'd', 'D', 'f', 'F', 'R', 'browse', 'customize', 'guide']).optional()
        .describe('Timestamp style (t=short time, T=long time, d=short date, D=long date, f=short datetime, F=long datetime, R=relative time) OR special tab name'),
      name: z.string().optional().describe('Name of emoji or slash command (required for emoji/slash_command)'),
      animated: z.boolean().optional().describe('Whether custom emoji is animated (default: false)'),
    },
    async ({ type, id, style, name, animated }) => {
      try {
        let syntax = '';
        let explanation = '';

        switch (type) {
          case 'user':
            syntax = `<@${id}>`;
            explanation = 'Clickable user profile mention pill.';
            break;
          case 'role':
            syntax = `<@&${id}>`;
            explanation = 'Colored, clickable role mention pill.';
            break;
          case 'channel':
            syntax = `<#${id}>`;
            explanation = 'Clickable channel link pill.';
            break;
          case 'timestamp':
            const tsStyle = style || 'f';
            syntax = `<t:${id}:${tsStyle}>`;
            explanation = `Dynamic timestamp with style "${tsStyle}". Automatically localized to each user's device timezone.`;
            break;
          case 'custom_emoji':
            syntax = animated ? `<a:${name || 'emoji'}:${id}>` : `<:${name || 'emoji'}:${id}>`;
            explanation = 'Custom server emoji display syntax.';
            break;
          case 'slash_command':
            syntax = `</${name || 'command'}:${id}>`;
            explanation = 'Clickable slash command shortcut pill.';
            break;
          case 'special_tab':
            const tab = style || id;
            syntax = `<id:${tab}>`;
            explanation = `Internal server tab link (${tab}). Options: <id:browse> (Channels & Roles), <id:customize> (Customize), <id:guide> (Server Guide).`;
            break;
        }

        return {
          content: [{
            type: 'text',
            text: `**Formatted Discord Syntax:**\n\`${syntax}\`\n\n**Usage:**\n${explanation}\n\nWhen posted in Discord, this renders natively as an interactive component.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to format mention: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'resolve_discord_mentions',
    'Automatically converts plain-text channel names (#general), role names (@Moderator), and usernames (@alice) in a message to valid clickable Discord mention syntax (<#id>, <@&id>, <@id>)',
    {
      text: z.string().describe('Message text containing plain-text mentions (e.g. "Check #rules-and-guidelines and ask @Moderator")'),
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ text, guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        let resolved = text;

        // 1. Resolve Channels (#name)
        const channels = await guild.channels.fetch();
        for (const channel of channels.values()) {
          if (!channel) continue;
          const cleanName = channel.name.replace(/^[^\w\d-]+/u, '');
          const names = [channel.name];
          if (cleanName && cleanName !== channel.name) names.push(cleanName);

          for (const n of names) {
            const regex = new RegExp(`#${escapeRegExp(n)}\\b`, 'gi');
            resolved = resolved.replace(regex, `<#${channel.id}>`);
          }
        }

        // 2. Resolve Roles (@name)
        const roles = await guild.roles.fetch();
        for (const role of roles.values()) {
          if (!role || role.name === '@everyone') continue;
          const cleanRole = role.name.replace(/^[^\w\d]+/u, '').trim();
          const roleNames = [role.name];
          if (cleanRole && cleanRole !== role.name) roleNames.push(cleanRole);

          for (const rn of roleNames) {
            const regex = new RegExp(`@${escapeRegExp(rn)}\\b`, 'gi');
            resolved = resolved.replace(regex, `<@&${role.id}>`);
          }
        }

        // 3. Resolve Members (@username)
        const members = await guild.members.fetch();
        for (const member of members.values()) {
          if (!member) continue;
          const userRegex = new RegExp(`@${escapeRegExp(member.user.username)}\\b`, 'gi');
          resolved = resolved.replace(userRegex, `<@${member.user.id}>`);
          if (member.nickname) {
            const nickRegex = new RegExp(`@${escapeRegExp(member.nickname)}\\b`, 'gi');
            resolved = resolved.replace(nickRegex, `<@${member.user.id}>`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: `**Resolved Discord Message:**\n\n${resolved}\n\n*(Ready to send via \`send_message\` or \`edit_message\`)*`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to resolve mentions: ${formatError(err)}` }] };
      }
    }
  );
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
