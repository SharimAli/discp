import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, resolveTextChannel } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { ThreadChannel, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';

export function registerThreadTools(server: McpServer): void {
  server.tool(
    'create_thread',
    'Start a new thread in a text channel or from a specific existing message',
    {
      channelId: z.string().describe('Channel ID where thread will be created'),
      name: z.string().describe('Thread name'),
      messageId: z.string().optional().describe('Message ID to attach thread to (creates a message thread)'),
      autoArchiveDuration: z.enum(['60', '1440', '4320', '10080']).default('1440').describe('Inactivity minutes before auto-archive: 60 (1h), 1440 (24h), 4320 (3d), 10080 (7d)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, name, messageId, autoArchiveDuration, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);

        let thread: ThreadChannel;
        const duration = parseInt(autoArchiveDuration, 10) as ThreadAutoArchiveDuration;

        if (messageId) {
          const msg = await channel.messages.fetch(messageId);
          thread = await msg.startThread({
            name,
            autoArchiveDuration: duration,
            reason,
          });
        } else if ('threads' in channel) {
          thread = await (channel as TextChannel).threads.create({
            name,
            autoArchiveDuration: duration,
            reason,
          });
        } else {
          return { content: [{ type: 'text', text: 'This channel does not support thread creation.' }] };
        }

        return { content: [{ type: 'text', text: `Created thread: "${thread.name}" (ID: \`${thread.id}\`) in #${(channel as any).name}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create thread: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'modify_thread',
    'Update thread properties (archive/unarchive, lock/unlock, rename, slowmode)',
    {
      threadId: z.string().describe('Thread Channel ID'),
      name: z.string().optional().describe('New thread name'),
      archived: z.boolean().optional().describe('Archive (close) or unarchive thread'),
      locked: z.boolean().optional().describe('Lock thread (only moderators can speak)'),
      slowmode: z.number().min(0).max(21600).optional().describe('Slowmode delay in seconds'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ threadId, name, archived, locked, slowmode, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(threadId);
        if (!channel || !channel.isThread()) {
          return { content: [{ type: 'text', text: `Thread not found for ID: ${threadId}` }] };
        }

        const thread = channel as ThreadChannel;
        const editData: Record<string, unknown> = {};

        if (name !== undefined) editData.name = name;
        if (archived !== undefined) editData.archived = archived;
        if (locked !== undefined) editData.locked = locked;
        if (slowmode !== undefined) editData.rateLimitPerUser = slowmode;

        await thread.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Successfully updated thread: "${thread.name}" (\`${thread.id}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to modify thread: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'join_thread',
    'Have the bot join a thread to receive notifications and messages',
    {
      threadId: z.string().describe('Thread Channel ID'),
    },
    async ({ threadId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(threadId);
        if (!channel || !channel.isThread()) {
          return { content: [{ type: 'text', text: `Thread not found for ID: ${threadId}` }] };
        }

        await (channel as ThreadChannel).join();
        return { content: [{ type: 'text', text: `Successfully joined thread: "${channel.name}" (\`${threadId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to join thread: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'leave_thread',
    'Have the bot leave a thread',
    {
      threadId: z.string().describe('Thread Channel ID'),
    },
    async ({ threadId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(threadId);
        if (!channel || !channel.isThread()) {
          return { content: [{ type: 'text', text: `Thread not found for ID: ${threadId}` }] };
        }

        await (channel as ThreadChannel).leave();
        return { content: [{ type: 'text', text: `Successfully left thread: "${channel.name}" (\`${threadId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to leave thread: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_active_threads',
    'List all active threads across the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        let threads: any[] = [];
        if (typeof (guild as any).channels?.fetchActiveThreads === 'function') {
          const active = await (guild as any).channels.fetchActiveThreads();
          threads = Array.from(active.threads.values());
        } else if (typeof (guild as any).threads?.fetchActive === 'function') {
          const active = await (guild as any).threads.fetchActive();
          threads = Array.from(active.threads.values());
        } else {
          threads = Array.from(guild.channels.cache.values()).filter(
            (c: any) => (c.isThread && c.isThread()) || c.type === 'GUILD_PUBLIC_THREAD' || c.type === 'GUILD_PRIVATE_THREAD'
          );
        }

        if (threads.length === 0) {
          return { content: [{ type: 'text', text: `No active threads found in ${guild.name}.` }] };
        }

        const lines = threads.map((t: any) => {
          const parent = t.parent ? `#${t.parent.name}` : 'Unknown channel';
          return `- **${t.name}** (ID: \`${t.id}\`) in ${parent} (Messages: ${t.messageCount || 0}, Members: ${t.memberCount || 0})`;
        });

        return { content: [{ type: 'text', text: `**Active Threads in ${guild.name} (${threads.length}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list active threads: ${formatError(err)}` }] };
      }
    }
  );
}
