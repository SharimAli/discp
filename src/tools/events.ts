import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatScheduledEvent } from '../utils/formatters.js';
import { formatError } from '../utils/errors.js';
import { GuildScheduledEventEntityType, GuildScheduledEventStatus } from 'discord.js';

export function registerEventTools(server: McpServer): void {
  server.tool(
    'create_scheduled_event',
    'Schedule a server event (Stage, Voice, or External location)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Event name'),
      description: z.string().optional().describe('Event description'),
      scheduledStartTime: z.string().describe('ISO-8601 start timestamp (e.g. 2026-10-15T18:00:00Z)'),
      scheduledEndTime: z.string().optional().describe('ISO-8601 end timestamp (required for external events)'),
      entityType: z.enum(['STAGE_INSTANCE', 'VOICE', 'EXTERNAL']).describe('Event type: STAGE_INSTANCE, VOICE, or EXTERNAL'),
      channelId: z.string().optional().describe('Voice or Stage channel ID (required for STAGE_INSTANCE and VOICE)'),
      location: z.string().optional().describe('External location name or URL (required for EXTERNAL)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, description, scheduledStartTime, scheduledEndTime, entityType, channelId, location, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        let typeVal = GuildScheduledEventEntityType.Voice;
        if (entityType === 'STAGE_INSTANCE') typeVal = GuildScheduledEventEntityType.StageInstance;
        if (entityType === 'EXTERNAL') typeVal = GuildScheduledEventEntityType.External;

        if (typeVal === GuildScheduledEventEntityType.External && !location) {
          return { content: [{ type: 'text', text: 'Location is required for EXTERNAL scheduled events.' }] };
        }
        if (typeVal !== GuildScheduledEventEntityType.External && !channelId) {
          return { content: [{ type: 'text', text: 'channelId is required for VOICE or STAGE_INSTANCE events.' }] };
        }

        const event = await guild.scheduledEvents.create({
          name,
          description: description || undefined,
          scheduledStartTime: new Date(scheduledStartTime),
          scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : undefined,
          entityType: typeVal,
          channel: channelId || undefined,
          entityMetadata: location ? { location } : undefined,
          privacyLevel: 2, // GUILD_ONLY
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Successfully created scheduled event: **${event.name}** (ID: \`${event.id}\`).`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create scheduled event: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_scheduled_event',
    'Modify details of a scheduled event or change its status (start, complete, cancel)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      eventId: z.string().describe('Scheduled Event ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      scheduledStartTime: z.string().optional().describe('New ISO-8601 start timestamp'),
      scheduledEndTime: z.string().optional().describe('New ISO-8601 end timestamp'),
      status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELED']).optional().describe('Change status (ACTIVE to start, COMPLETED to end, CANCELED)'),
      location: z.string().optional().describe('New external location'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, eventId, name, description, scheduledStartTime, scheduledEndTime, status, location, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const event = await guild.scheduledEvents.fetch(eventId);

        const editData: Record<string, unknown> = {};
        if (name !== undefined) editData.name = name;
        if (description !== undefined) editData.description = description;
        if (scheduledStartTime !== undefined) editData.scheduledStartTime = new Date(scheduledStartTime);
        if (scheduledEndTime !== undefined) editData.scheduledEndTime = new Date(scheduledEndTime);
        if (location !== undefined) editData.entityMetadata = { location };

        if (status !== undefined) {
          if (status === 'ACTIVE') editData.status = GuildScheduledEventStatus.Active;
          if (status === 'COMPLETED') editData.status = GuildScheduledEventStatus.Completed;
          if (status === 'CANCELED') editData.status = GuildScheduledEventStatus.Canceled;
        }

        await event.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Successfully updated event: **${event.name}** (\`${eventId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit scheduled event: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_scheduled_event',
    'Permanently delete a scheduled event',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      eventId: z.string().describe('Scheduled Event ID to delete'),
    },
    async ({ guildId, eventId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const event = await guild.scheduledEvents.fetch(eventId);

        const name = event.name;
        await event.delete();
        return { content: [{ type: 'text', text: `Successfully deleted event: **${name}** (\`${eventId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete scheduled event: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_scheduled_events',
    'List all scheduled and active events on the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const events = await guild.scheduledEvents.fetch({ withUserCount: true });
        if (events.size === 0) {
          return { content: [{ type: 'text', text: `No scheduled events found on ${guild.name}.` }] };
        }

        const lines = Array.from(events.values()).map(formatScheduledEvent).join('\n');
        return { content: [{ type: 'text', text: `**Scheduled Events on ${guild.name} (${events.size}):**\n\n${lines}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list scheduled events: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_scheduled_event_users',
    'Get users interested in or subscribed to a scheduled event',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      eventId: z.string().describe('Scheduled Event ID'),
      limit: z.number().min(1).max(100).default(50).describe('Max users to return (1-100, default: 50)'),
    },
    async ({ guildId, eventId, limit }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const event = await guild.scheduledEvents.fetch(eventId);

        const subscribers = await event.fetchSubscribers({ limit, withMember: true });
        if (subscribers.size === 0) {
          return { content: [{ type: 'text', text: `No subscribers yet for event "${event.name}".` }] };
        }

        const lines = subscribers.map((sub) => `- **${sub.user.tag}** (\`${sub.user.id}\`)`);
        return {
          content: [{
            type: 'text',
            text: `**Interested Users for "${event.name}" (${subscribers.size}):**\n\n${lines.join('\n')}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get event subscribers: ${formatError(err)}` }] };
      }
    }
  );
}
