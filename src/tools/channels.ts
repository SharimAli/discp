import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, createGuildChannel } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { formatChannelType } from '../utils/formatters.js';
import {
  ChannelType,
  CategoryChannel,
  TextChannel,
  VoiceChannel,
  StageChannel,
  GuildChannel,
} from 'discord.js';

function isCategory(channel: any): boolean {
  if (!channel) return false;
  return channel.type === ChannelType.GuildCategory || channel.type === 'GUILD_CATEGORY' || channel.type === 4;
}

export function registerChannelTools(server: McpServer): void {
  server.tool(
    'create_text_channel',
    'Create a new text channel in a server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Channel name'),
      categoryId: z.string().optional().describe('Parent category ID'),
      topic: z.string().optional().describe('Channel topic'),
      nsfw: z.boolean().optional().describe('Whether channel is marked NSFW'),
      slowmode: z.number().min(0).max(21600).optional().describe('Slowmode delay in seconds (0-21600)'),
      position: z.number().optional().describe('Channel position in channel list'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, categoryId, topic, nsfw, slowmode, position, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const channel = await createGuildChannel(guild, {
          name,
          type: ChannelType.GuildText,
          parent: categoryId || undefined,
          topic: topic || undefined,
          nsfw: nsfw || undefined,
          rateLimitPerUser: slowmode !== undefined ? slowmode : undefined,
          position: position !== undefined ? position : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Created text channel: #${channel.name} (ID: \`${channel.id}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create text channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_voice_channel',
    'Create a new voice channel in a server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Voice channel name'),
      categoryId: z.string().optional().describe('Parent category ID'),
      userLimit: z.number().min(0).max(99).optional().describe('Max user limit (0 = unlimited, max: 99)'),
      bitrate: z.number().optional().describe('Audio bitrate in bits/s (e.g. 64000)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, categoryId, userLimit, bitrate, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const channel = await createGuildChannel(guild, {
          name,
          type: ChannelType.GuildVoice,
          parent: categoryId || undefined,
          userLimit: userLimit !== undefined ? userLimit : undefined,
          bitrate: bitrate !== undefined ? bitrate : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Created voice channel: ${channel.name} (ID: \`${channel.id}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create voice channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_stage_channel',
    'Create a new stage channel for audio events and presentations',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Stage channel name'),
      categoryId: z.string().optional().describe('Parent category ID'),
      bitrate: z.number().optional().describe('Audio bitrate in bits/s'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, categoryId, bitrate, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const channel = await createGuildChannel(guild, {
          name,
          type: ChannelType.GuildStageVoice,
          parent: categoryId || undefined,
          bitrate: bitrate !== undefined ? bitrate : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Created stage channel: ${channel.name} (ID: \`${channel.id}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create stage channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_category',
    'Create a channel category in a server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Category name'),
      position: z.number().optional().describe('Position in channel list'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, position, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const category = await createGuildChannel(guild, {
          name,
          type: ChannelType.GuildCategory,
          position: position !== undefined ? position : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Created category: "${category.name}" (ID: \`${category.id}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create category: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_channel',
    'Edit properties of a text, voice, or stage channel',
    {
      channelId: z.string().describe('Channel ID to edit'),
      name: z.string().optional().describe('New channel name'),
      topic: z.string().optional().describe('New channel topic (text channels)'),
      nsfw: z.boolean().optional().describe('Set NSFW flag'),
      slowmode: z.number().min(0).max(21600).optional().describe('Slowmode delay in seconds'),
      categoryId: z.string().optional().describe('Move to category ID (empty string to unparent)'),
      position: z.number().optional().describe('New position index'),
      userLimit: z.number().optional().describe('New user limit (voice channels)'),
      bitrate: z.number().optional().describe('New bitrate (voice channels)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, name, topic, nsfw, slowmode, categoryId, position, userLimit, bitrate, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('guild' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found or not in a guild: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        const editData: Record<string, unknown> = {};

        if (name !== undefined) editData.name = name;
        if (topic !== undefined && 'setTopic' in guildChannel) editData.topic = topic;
        if (nsfw !== undefined && 'setNSFW' in guildChannel) editData.nsfw = nsfw;
        if (slowmode !== undefined && 'setRateLimitPerUser' in guildChannel) editData.rateLimitPerUser = slowmode;
        if (categoryId !== undefined) editData.parent = categoryId === '' ? null : categoryId;
        if (position !== undefined) editData.position = position;
        if (userLimit !== undefined && 'setUserLimit' in guildChannel) editData.userLimit = userLimit;
        if (bitrate !== undefined && 'setBitrate' in guildChannel) editData.bitrate = bitrate;

        await guildChannel.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Updated channel: #${guildChannel.name} (ID: \`${channelId}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_category',
    'Edit category name or position',
    {
      categoryId: z.string().describe('Category ID'),
      name: z.string().optional().describe('New category name'),
      position: z.number().optional().describe('New position index'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ categoryId, name, position, reason }) => {
      try {
        const client = await getDiscordClient();
        const category = await client.channels.fetch(categoryId);
        if (!isCategory(category)) {
          return { content: [{ type: 'text', text: `Category not found: ${categoryId}` }] };
        }

        await (category as CategoryChannel).edit({
          name: name || undefined,
          position: position !== undefined ? position : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Updated category: "${category.name}" (ID: \`${categoryId}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit category: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_channel',
    'Delete a channel from a server',
    {
      channelId: z.string().describe('Channel ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('delete' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found: ${channelId}` }] };
        }

        const name = 'name' in channel ? (channel as any).name : channelId;
        await (channel as GuildChannel).delete(reason);
        return { content: [{ type: 'text', text: `Deleted channel: #${name} (ID: \`${channelId}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_category',
    'Delete a channel category (channels inside will become unparented)',
    {
      categoryId: z.string().describe('Category ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ categoryId, reason }) => {
      try {
        const client = await getDiscordClient();
        const category = await client.channels.fetch(categoryId);
        if (!isCategory(category)) {
          return { content: [{ type: 'text', text: `Category not found: ${categoryId}` }] };
        }

        const name = (category as CategoryChannel).name;
        await (category as CategoryChannel).delete(reason);
        return { content: [{ type: 'text', text: `Deleted category: "${name}" (ID: \`${categoryId}\`)` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete category: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_channels',
    'List all channels in a server with types and IDs',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const channels = await guild.channels.fetch();

        if (channels.size === 0) {
          return { content: [{ type: 'text', text: `No channels found in ${guild.name}.` }] };
        }

        const list = Array.from(channels.values())
          .filter(Boolean)
          .map((c) => `- [${formatChannelType(c!.type)}] **${c!.name}** (ID: \`${c!.id}\`)`)
          .join('\n');

        return { content: [{ type: 'text', text: `**Channels in ${guild.name} (${channels.size}):**\n${list}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list channels: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_channels_in_category',
    'List all channels grouped under a specific category',
    {
      categoryId: z.string().describe('Category ID'),
    },
    async ({ categoryId }) => {
      try {
        const client = await getDiscordClient();
        const category = await client.channels.fetch(categoryId);
        if (!isCategory(category)) {
          return { content: [{ type: 'text', text: `Category not found: ${categoryId}` }] };
        }

        const cat = category as CategoryChannel;
        const rawChildren = (cat.children as any);
        const children = (rawChildren && 'cache' in rawChildren) ? rawChildren.cache : rawChildren;

        if (!children || children.size === 0) {
          return { content: [{ type: 'text', text: `No channels found under category "${cat.name}".` }] };
        }

        const list = Array.from(children.values())
          .map((c: any) => `- [${formatChannelType(c.type)}] **${c.name}** (ID: \`${c.id}\`)`)
          .join('\n');

        return { content: [{ type: 'text', text: `**Channels in category "${cat.name}" (${children.size}):**\n${list}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list channels in category: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'find_channel',
    'Find a channel by exact or partial name in a server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Channel name to search for'),
    },
    async ({ guildId, name }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const channels = await guild.channels.fetch();

        const query = name.toLowerCase();
        const matched = Array.from(channels.values())
          .filter((c) => c && c.name.toLowerCase().includes(query));

        if (matched.length === 0) {
          return { content: [{ type: 'text', text: `No channels found matching "${name}" in ${guild.name}.` }] };
        }

        const list = matched
          .map((c) => `- [${formatChannelType(c!.type)}] **${c!.name}** (ID: \`${c!.id}\`)`)
          .join('\n');

        return { content: [{ type: 'text', text: `**Matched ${matched.length} channel(s):**\n${list}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to find channel: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_channel_info',
    'Get detailed information about a specific channel',
    {
      channelId: z.string().describe('Channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
          return { content: [{ type: 'text', text: `Channel not found: ${channelId}` }] };
        }

        const typeName = formatChannelType(channel.type);
        const lines: string[] = [
          `**Name:** ${'name' in channel ? (channel as any).name : 'DM'}`,
          `**ID:** \`${channel.id}\``,
          `**Type:** ${typeName}`,
          `**Created:** ${channel.createdAt?.toISOString() || 'Unknown'}`,
        ];

        if ('parent' in channel && channel.parent) {
          lines.push(`**Category:** ${channel.parent.name} (\`${channel.parent.id}\`)`);
        }
        if ('topic' in channel && channel.topic) {
          lines.push(`**Topic:** ${channel.topic}`);
        }
        if ('rateLimitPerUser' in channel && typeof channel.rateLimitPerUser === 'number') {
          lines.push(`**Slowmode:** ${channel.rateLimitPerUser}s`);
        }
        if ('bitrate' in channel && typeof channel.bitrate === 'number') {
          lines.push(`**Bitrate:** ${channel.bitrate} bps`);
        }
        if ('userLimit' in channel && typeof channel.userLimit === 'number') {
          lines.push(`**User Limit:** ${channel.userLimit === 0 ? 'Unlimited' : channel.userLimit}`);
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get channel info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'move_channel',
    'Move a channel to another category and/or change its position index',
    {
      channelId: z.string().describe('Channel ID to move'),
      categoryId: z.string().optional().describe('Target category ID (empty string to unparent)'),
      position: z.number().optional().describe('Target position index'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, categoryId, position, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('setParent' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found or cannot be moved: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        if (categoryId !== undefined) {
          await guildChannel.setParent(categoryId === '' ? null : categoryId, { reason });
        }
        if (position !== undefined) {
          await guildChannel.setPosition(position, { reason });
        }

        return { content: [{ type: 'text', text: `Successfully moved channel #${guildChannel.name} (\`${channelId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to move channel: ${formatError(err)}` }] };
      }
    }
  );
}
