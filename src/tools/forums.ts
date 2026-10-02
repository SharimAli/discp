import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import {
  ChannelType,
  ForumChannel,
  ThreadChannel,
  SortOrderType,
  ForumLayoutType,
} from 'discord.js';

export function registerForumTools(server: McpServer): void {
  server.tool(
    'create_forum_channel',
    'Create a new forum channel for community discussions and threads',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Forum channel name'),
      categoryId: z.string().optional().describe('Parent category ID'),
      topic: z.string().optional().describe('Guidelines or topic for the forum'),
      nsfw: z.boolean().optional().describe('Mark as NSFW'),
      slowmode: z.number().min(0).max(21600).optional().describe('Default slowmode per user (seconds)'),
      position: z.number().optional().describe('Position index'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, categoryId, topic, nsfw, slowmode, position, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const forum = await guild.channels.create({
          name,
          type: ChannelType.GuildForum,
          parent: categoryId || undefined,
          topic: topic || undefined,
          nsfw: nsfw || undefined,
          defaultThreadRateLimitPerUser: slowmode !== undefined ? slowmode : undefined,
          position: position !== undefined ? position : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Created forum channel: #${forum.name} (ID: \`${forum.id}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create forum channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_forum_channel',
    'Edit forum channel settings (name, topic, sort order, layout, slowmode)',
    {
      channelId: z.string().describe('Forum channel ID'),
      name: z.string().optional().describe('New name'),
      topic: z.string().optional().describe('New topic / guidelines'),
      nsfw: z.boolean().optional().describe('NSFW flag'),
      slowmode: z.number().min(0).max(21600).optional().describe('Default thread slowmode in seconds'),
      categoryId: z.string().optional().describe('Category ID (empty string to unparent)'),
      position: z.number().optional().describe('Position index'),
      defaultSort: z.enum(['LATEST_ACTIVITY', 'CREATION_DATE']).optional().describe('Default post sorting order'),
      defaultLayout: z.enum(['LIST_VIEW', 'GALLERY_VIEW']).optional().describe('Default layout'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, name, topic, nsfw, slowmode, categoryId, position, defaultSort, defaultLayout, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
          return { content: [{ type: 'text', text: `Forum channel not found for ID: ${channelId}` }] };
        }

        const forum = channel as ForumChannel;
        const editData: Record<string, unknown> = {};

        if (name !== undefined) editData.name = name;
        if (topic !== undefined) editData.topic = topic;
        if (nsfw !== undefined) editData.nsfw = nsfw;
        if (slowmode !== undefined) editData.defaultThreadRateLimitPerUser = slowmode;
        if (categoryId !== undefined) editData.parent = categoryId === '' ? null : categoryId;
        if (position !== undefined) editData.position = position;

        if (defaultSort !== undefined) {
          editData.defaultSortOrder = defaultSort === 'LATEST_ACTIVITY' ? SortOrderType.LatestActivity : SortOrderType.CreationDate;
        }
        if (defaultLayout !== undefined) {
          editData.defaultForumLayout = defaultLayout === 'LIST_VIEW' ? ForumLayoutType.ListView : ForumLayoutType.GalleryView;
        }

        await forum.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Updated forum channel: #${forum.name} (ID: \`${channelId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit forum channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_forum_channels',
    'List all forum channels in the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const channels = await guild.channels.fetch();

        const forums = Array.from(channels.values()).filter((c) => c && c.type === ChannelType.GuildForum);
        if (forums.length === 0) {
          return { content: [{ type: 'text', text: `No forum channels found in ${guild.name}.` }] };
        }

        const lines = forums.map((f) => `- **#${f!.name}** (ID: \`${f!.id}\`) ${f!.parent ? `in [${f!.parent.name}]` : ''}`);
        return { content: [{ type: 'text', text: `**Forum Channels in ${guild.name} (${forums.length}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list forum channels: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_forum_channel_info',
    'Get detailed forum info including active posts and available tags',
    {
      channelId: z.string().describe('Forum channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
          return { content: [{ type: 'text', text: `Forum channel not found for ID: ${channelId}` }] };
        }

        const forum = channel as ForumChannel;
        const tags = forum.availableTags.map((t) => `  • ${t.name} (ID: \`${t.id}\`) ${t.moderated ? '[Moderated]' : ''}`).join('\n') || '  None';

        const lines = [
          `**Name:** #${forum.name}`,
          `**ID:** \`${forum.id}\``,
          `**Topic:** ${forum.topic || 'None'}`,
          `**NSFW:** ${forum.nsfw}`,
          `**Default Slowmode:** ${forum.defaultThreadRateLimitPerUser || 0}s`,
          `**Tags (${forum.availableTags.length}):**\n${tags}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get forum channel info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_forum_tags',
    'List all tags configured on a forum channel',
    {
      channelId: z.string().describe('Forum channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
          return { content: [{ type: 'text', text: `Forum channel not found: ${channelId}` }] };
        }

        const forum = channel as ForumChannel;
        if (forum.availableTags.length === 0) {
          return { content: [{ type: 'text', text: `No tags configured on #${forum.name}.` }] };
        }

        const lines = forum.availableTags.map((t) => `- **${t.name}** (ID: \`${t.id}\`) ${t.moderated ? '[Mod Only]' : ''}`);
        return { content: [{ type: 'text', text: `**Tags for #${forum.name} (${forum.availableTags.length}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list forum tags: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_forum_post',
    'Create a new forum post (thread) with an initial message and optional tags',
    {
      channelId: z.string().describe('Forum channel ID'),
      title: z.string().describe('Post title'),
      message: z.string().describe('Content of initial post message'),
      tagIdsCsv: z.string().optional().describe('Comma-separated list of tag IDs to apply'),
    },
    async ({ channelId, title, message, tagIdsCsv }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
          return { content: [{ type: 'text', text: `Forum channel not found: ${channelId}` }] };
        }

        const forum = channel as ForumChannel;
        const appliedTags = tagIdsCsv ? tagIdsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

        const post = await forum.threads.create({
          name: title,
          message: { content: message },
          appliedTags,
        });

        return { content: [{ type: 'text', text: `Created forum post: "${post.name}" (ID: \`${post.id}\`) in #${forum.name}. Link: ${post.url}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create forum post: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_forum_posts',
    'List active posts in a forum channel',
    {
      channelId: z.string().describe('Forum channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
          return { content: [{ type: 'text', text: `Forum channel not found: ${channelId}` }] };
        }

        const forum = channel as ForumChannel;
        const threads = await forum.threads.fetchActive();

        if (threads.threads.size === 0) {
          return { content: [{ type: 'text', text: `No active posts found in #${forum.name}.` }] };
        }

        const lines = threads.threads.map((t) => {
          const locked = t.locked ? ' [Locked]' : '';
          const pinned = t.flags?.has('Pinned') ? ' [Pinned]' : '';
          return `- **${t.name}** (ID: \`${t.id}\`)${locked}${pinned} (Messages: ${t.messageCount || 0})`;
        });

        return { content: [{ type: 'text', text: `**Active Posts in #${forum.name} (${threads.threads.size}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list forum posts: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'modify_forum_post',
    'Modify forum post properties (lock, archive, pin, tags)',
    {
      postId: z.string().describe('Forum post thread ID'),
      locked: z.boolean().optional().describe('Lock post'),
      archived: z.boolean().optional().describe('Archive post'),
      pinned: z.boolean().optional().describe('Pin post to top of forum'),
      tagIdsCsv: z.string().optional().describe('Comma-separated tag IDs (empty string to clear)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ postId, locked, archived, pinned, tagIdsCsv, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(postId);
        if (!channel || !channel.isThread()) {
          return { content: [{ type: 'text', text: `Forum post not found for ID: ${postId}` }] };
        }

        const thread = channel as ThreadChannel;
        const editData: Record<string, unknown> = {};

        if (locked !== undefined) editData.locked = locked;
        if (archived !== undefined) editData.archived = archived;
        if (pinned !== undefined) editData.flags = pinned ? 2 : 0; // PINNED flag in ThreadChannel
        if (tagIdsCsv !== undefined) {
          editData.appliedTags = tagIdsCsv === '' ? [] : tagIdsCsv.split(',').map((s) => s.trim()).filter(Boolean);
        }

        await thread.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Successfully updated forum post "${thread.name}" (\`${postId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to modify forum post: ${formatError(err)}` }] };
      }
    }
  );
}
