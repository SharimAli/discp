import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveTextChannel, formatBytes } from '../utils/discord.js';
import { formatMessageList } from '../utils/formatters.js';
import { formatError } from '../utils/errors.js';
import { Message, TextChannel } from 'discord.js';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveTextMentions(guild: any, text: string): Promise<string> {
  if (!guild) return text;
  let resolved = text;
  try {
    const channels = await guild.channels.fetch();
    for (const ch of channels.values()) {
      if (!ch) continue;
      const cleanName = ch.name.replace(/^[^\w\d-]+/u, '');
      const names = [ch.name];
      if (cleanName && cleanName !== ch.name) names.push(cleanName);

      for (const n of names) {
        const regex = new RegExp(`#${escapeRegExp(n)}\\b`, 'gi');
        resolved = resolved.replace(regex, `<#${ch.id}>`);
      }
    }
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
  } catch {}
  return resolved;
}

export function registerMessageTools(server: McpServer): void {
  server.tool(
    'send_message',
    'Send a message to a specific Discord channel with optional reply threading and automatic mention resolution',
    {
      channelId: z.string().describe('Discord channel ID'),
      message: z.string().describe('Message content (up to 2000 characters)'),
      replyToMessageId: z.string().optional().describe('Message ID to reply to'),
      resolveMentions: z.boolean().optional().describe('Automatically convert #channel-name and @RoleName into clickable Discord mention pills'),
    },
    async ({ channelId, message, replyToMessageId, resolveMentions }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);

        let content = message;
        if (resolveMentions && 'guild' in channel && (channel as any).guild) {
          content = await resolveTextMentions((channel as any).guild, message);
        }

        const sent = await channel.send({
          content,
          reply: replyToMessageId ? { messageReference: replyToMessageId } : undefined,
        });

        return {
          content: [{
            type: 'text',
            text: `Message sent successfully. Link: ${sent.url} (ID: \`${sent.id}\`)`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to send message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_message',
    'Edit an existing message previously sent by the bot with optional automatic mention resolution',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Message ID to edit'),
      newMessage: z.string().describe('New content for the message'),
      resolveMentions: z.boolean().optional().describe('Automatically convert #channel-name and @RoleName into clickable Discord mention pills'),
    },
    async ({ channelId, messageId, newMessage, resolveMentions }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        let content = newMessage;
        if (resolveMentions && 'guild' in channel && (channel as any).guild) {
          content = await resolveTextMentions((channel as any).guild, newMessage);
        }

        const edited = await msg.edit(content);
        return { content: [{ type: 'text', text: `Message edited successfully. Link: ${edited.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_message',
    'Delete a specific message from a channel',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Message ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, messageId, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        await msg.delete();
        return { content: [{ type: 'text', text: `Message \`${messageId}\` deleted successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'read_messages',
    'Read message history from a channel with pagination support (before, after, around)',
    {
      channelId: z.string().describe('Discord channel ID'),
      count: z.number().min(1).max(100).default(50).describe('Number of messages to retrieve (1-100, default: 50)'),
      before: z.string().optional().describe('Get messages before this message ID'),
      after: z.string().optional().describe('Get messages after this message ID'),
      around: z.string().optional().describe('Get messages around this message ID'),
    },
    async ({ channelId, count, before, after, around }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);

        const options: { limit: number; before?: string; after?: string; around?: string } = { limit: count };
        if (before) options.before = before;
        else if (after) options.after = after;
        else if (around) options.around = around;

        const messages = await channel.messages.fetch(options);
        const sorted = (Array.from(messages.values()) as Message[]).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        return {
          content: [{
            type: 'text',
            text: `**Retrieved ${sorted.length} message(s):**\n\n${formatMessageList(sorted)}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to read messages: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'bulk_delete_messages',
    'Bulk delete (purge) multiple recent messages in a channel (max 100, messages must be < 14 days old)',
    {
      channelId: z.string().describe('Discord channel ID'),
      count: z.number().min(2).max(100).describe('Number of messages to delete (2-100)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, count, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        if (!('bulkDelete' in channel)) {
          return { content: [{ type: 'text', text: 'Channel does not support bulk deletion.' }] };
        }

        const deleted = await (channel as TextChannel).bulkDelete(count, true);
        return {
          content: [{
            type: 'text',
            text: `Successfully purged ${deleted.size} messages from channel #${(channel as any).name ?? channelId}.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to bulk delete messages: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'pin_message',
    'Pin a message to the top of a channel',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Message ID to pin'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, messageId, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        await msg.pin(reason);
        return { content: [{ type: 'text', text: `Message \`${messageId}\` pinned successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to pin message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'unpin_message',
    'Unpin a message from a channel',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Message ID to unpin'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, messageId, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        await msg.unpin(reason);
        return { content: [{ type: 'text', text: `Message \`${messageId}\` unpinned successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to unpin message: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_pinned_messages',
    'List all pinned messages in a channel',
    {
      channelId: z.string().describe('Discord channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const pins = await channel.messages.fetchPinned();

        if (pins.size === 0) {
          return { content: [{ type: 'text', text: 'No pinned messages found in this channel.' }] };
        }

        const sorted = (Array.from(pins.values()) as Message[]).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        return {
          content: [{
            type: 'text',
            text: `**Pinned Messages (${pins.size}):**\n\n${formatMessageList(sorted)}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch pinned messages: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'add_reaction',
    'Add an emoji reaction to a message',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Discord message ID'),
      emoji: z.string().describe('Emoji character (e.g. "👍") or custom emoji ID/name'),
    },
    async ({ channelId, messageId, emoji }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        await msg.react(emoji);
        return { content: [{ type: 'text', text: `Added reaction ${emoji} to message ${msg.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to add reaction: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'remove_reaction',
    'Remove an emoji reaction from a message',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Discord message ID'),
      emoji: z.string().describe('Emoji character or custom emoji name/ID'),
    },
    async ({ channelId, messageId, emoji }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        const reaction = msg.reactions.cache.get(emoji);
        if (reaction) {
          await reaction.users.remove(client.user?.id);
        } else {
          await msg.reactions.resolve(emoji)?.users.remove(client.user?.id);
        }

        return { content: [{ type: 'text', text: `Removed reaction ${emoji} from message ${msg.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to remove reaction: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'clear_reactions',
    'Remove all reactions from a message',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Discord message ID'),
    },
    async ({ channelId, messageId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        await msg.reactions.removeAll();
        return { content: [{ type: 'text', text: `Cleared all reactions from message ${msg.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to clear reactions: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_message_attachments',
    'Inspect file attachments on a specific message (file names, sizes, content types, URLs)',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Discord message ID'),
      attachmentId: z.string().optional().describe('Specific attachment ID (omitted returns all)'),
    },
    async ({ channelId, messageId, attachmentId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        if (msg.attachments.size === 0) {
          return { content: [{ type: 'text', text: 'This message has no file attachments.' }] };
        }

        let attachments = Array.from(msg.attachments.values()) as any[];
        if (attachmentId) {
          attachments = attachments.filter((a) => a.id === attachmentId);
          if (attachments.length === 0) {
            return { content: [{ type: 'text', text: `Attachment ID ${attachmentId} not found on this message.` }] };
          }
        }

        const lines = attachments.map((att) => [
          `- **${att.name}** (ID: \`${att.id}\`)`,
          `  • Size: ${formatBytes(att.size)}`,
          `  • Type: ${att.contentType || 'unknown'}`,
          `  • URL: ${att.url}`,
          `  • Proxy URL: ${att.proxyURL}`,
        ].join('\n'));

        return { content: [{ type: 'text', text: lines.join('\n\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get attachments: ${formatError(err)}` }] };
      }
    }
  );
}
