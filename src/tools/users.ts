import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatMessageList } from '../utils/formatters.js';
import { formatError } from '../utils/errors.js';

export function registerUserTools(server: McpServer): void {
  server.tool(
    'get_user_info',
    'Get profile information about a Discord user by ID (avatar, bot status, creation date)',
    {
      userId: z.string().describe('Discord User ID'),
    },
    async ({ userId }) => {
      try {
        const client = await getDiscordClient();
        const user = await client.users.fetch(userId);

        const lines = [
          `**Username:** ${user.tag} (\`${user.username}\`)`,
          `**User ID:** \`${user.id}\``,
          `**Bot:** ${user.bot}`,
          `**Created:** ${user.createdAt.toISOString()}`,
          `**Avatar URL:** ${user.displayAvatarURL({ size: 1024 })}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch user info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_user_id_by_name',
    'Get a Discord user ID by username or nickname in a server for mention formatting (<@id>)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      username: z.string().describe('Username or nickname (e.g. "username" or "username#discriminator")'),
    },
    async ({ guildId, username }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const members = await guild.members.fetch();
        const query = username.toLowerCase();

        const matched = Array.from(members.values()).filter((m) => {
          return (
            m.user.username.toLowerCase() === query ||
            m.user.tag.toLowerCase() === query ||
            (m.nickname && m.nickname.toLowerCase() === query)
          );
        });

        if (matched.length === 0) {
          return { content: [{ type: 'text', text: `No user found matching "${username}" in ${guild.name}.` }] };
        }

        if (matched.length > 1) {
          const list = matched.map((m) => `- ${m.user.tag} (ID: \`${m.id}\`)`).join('\n');
          return {
            content: [{
              type: 'text',
              text: `Multiple members matched "${username}". Please specify by ID:\n${list}`,
            }],
          };
        }

        const member = matched[0];
        return {
          content: [{
            type: 'text',
            text: `Found user: **${member.user.tag}** with ID: \`${member.id}\` (Mention: <@${member.id}>)`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to find user ID: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'send_direct_message',
    'Send a direct private message (DM) to a specific Discord user',
    {
      userId: z.string().describe('Target Discord User ID'),
      message: z.string().describe('Direct message text to send'),
    },
    async ({ userId, message }) => {
      try {
        const client = await getDiscordClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        const sent = await dm.send(message);

        return { content: [{ type: 'text', text: `DM sent to ${user.tag} successfully. Link: ${sent.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to send direct message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_direct_message',
    'Edit a previously sent direct message to a user',
    {
      userId: z.string().describe('Discord User ID'),
      messageId: z.string().describe('Message ID to edit'),
      newMessage: z.string().describe('New content for the direct message'),
    },
    async ({ userId, messageId, newMessage }) => {
      try {
        const client = await getDiscordClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        const msg = await dm.messages.fetch(messageId);

        const edited = await msg.edit(newMessage);
        return { content: [{ type: 'text', text: `DM edited successfully. Link: ${edited.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit direct message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_direct_message',
    'Delete a previously sent direct message to a user',
    {
      userId: z.string().describe('Discord User ID'),
      messageId: z.string().describe('Message ID to delete'),
    },
    async ({ userId, messageId }) => {
      try {
        const client = await getDiscordClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();
        const msg = await dm.messages.fetch(messageId);

        await msg.delete();
        return { content: [{ type: 'text', text: `Direct message \`${messageId}\` deleted successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete direct message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'read_direct_messages',
    'Read direct message conversation history with a user',
    {
      userId: z.string().describe('Discord User ID'),
      count: z.number().min(1).max(100).default(50).describe('Number of messages to retrieve (1-100, default: 50)'),
      before: z.string().optional().describe('Fetch messages before this message ID'),
      after: z.string().optional().describe('Fetch messages after this message ID'),
      around: z.string().optional().describe('Fetch messages around this message ID'),
    },
    async ({ userId, count, before, after, around }) => {
      try {
        const client = await getDiscordClient();
        const user = await client.users.fetch(userId);
        const dm = await user.createDM();

        const options: { limit: number; before?: string; after?: string; around?: string } = { limit: count };
        if (before) options.before = before;
        else if (after) options.after = after;
        else if (around) options.around = around;

        const messages = await dm.messages.fetch(options);
        const sorted = (Array.from(messages.values()) as any[]).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        return {
          content: [{
            type: 'text',
            text: `**DMs with ${user.tag} (${sorted.length} messages):**\n\n${formatMessageList(sorted as any)}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to read direct messages: ${formatError(err)}` }] };
      }
    }
  );
}
