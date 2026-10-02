import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { parsePermissionsInput, formatPermissions, humanPace } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { GuildChannel, OverwriteType } from 'discord.js';

function toCanonicalFlag(flagName: string): string {
  const clean = flagName.replace(/[\s_-]+/g, '').toLowerCase();
  const v13Flags: Record<string, string> = {
    createinstantinvite: 'CREATE_INSTANT_INVITE',
    kickmembers: 'KICK_MEMBERS',
    banmembers: 'BAN_MEMBERS',
    administrator: 'ADMINISTRATOR',
    managechannels: 'MANAGE_CHANNELS',
    manageguild: 'MANAGE_GUILD',
    addreactions: 'ADD_REACTIONS',
    viewauditlog: 'VIEW_AUDIT_LOG',
    priorityspeaker: 'PRIORITY_SPEAKER',
    stream: 'STREAM',
    viewchannel: 'VIEW_CHANNEL',
    sendmessages: 'SEND_MESSAGES',
    sendttsmessages: 'SEND_TTS_MESSAGES',
    managemessages: 'MANAGE_MESSAGES',
    embedlinks: 'EMBED_LINKS',
    attachfiles: 'ATTACH_FILES',
    readmessagehistory: 'READ_MESSAGE_HISTORY',
    mentioneveryone: 'MENTION_EVERYONE',
    useexternalemojis: 'USE_EXTERNAL_EMOJIS',
    viewguildinsights: 'VIEW_GUILD_INSIGHTS',
    connect: 'CONNECT',
    speak: 'SPEAK',
    mutemembers: 'MUTE_MEMBERS',
    deafenmembers: 'DEAFEN_MEMBERS',
    movemembers: 'MOVE_MEMBERS',
    usevad: 'USE_VAD',
    changenickname: 'CHANGE_NICKNAME',
    managenicknames: 'MANAGE_NICKNAMES',
    manageroles: 'MANAGE_ROLES',
    managewebhooks: 'MANAGE_WEBHOOKS',
    manageemojisandstickers: 'MANAGE_EMOJIS_AND_STICKERS',
    manageguildexpressions: 'MANAGE_GUILD_EXPRESSIONS',
    useapplicationcommands: 'USE_APPLICATION_COMMANDS',
    requesttospeak: 'REQUEST_TO_SPEAK',
    manageevents: 'MANAGE_EVENTS',
    managethreads: 'MANAGE_THREADS',
    createpublicthreads: 'CREATE_PUBLIC_THREADS',
    createprivatethreads: 'CREATE_PRIVATE_THREADS',
    useexternalsounds: 'USE_EXTERNAL_SOUNDS',
    sendmessagesinthreads: 'SEND_MESSAGES_IN_THREADS',
    startembeddedactivities: 'START_EMBEDDED_ACTIVITIES',
    moderatemembers: 'MODERATE_MEMBERS',
    usesoundboard: 'USE_SOUNDBOARD',
    useclydeai: 'USE_CLYDE_AI',
    sendvoicemessages: 'SEND_VOICE_MESSAGES',
    sendpolls: 'SEND_POLLS',
    useexternalapps: 'USE_EXTERNAL_APPS',
  };
  return v13Flags[clean] || flagName;
}

export function registerPermissionTools(server: McpServer): void {
  server.tool(
    'list_channel_permissions',
    'List all permission overwrites for a channel broken down by role and member',
    {
      channelId: z.string().describe('Channel ID'),
    },
    async ({ channelId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('permissionOverwrites' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found or has no permission overwrites: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        const overwrites = guildChannel.permissionOverwrites.cache;

        if (overwrites.size === 0) {
          return { content: [{ type: 'text', text: `No custom permission overwrites on #${guildChannel.name}.` }] };
        }

        const lines = overwrites.map((ow) => {
          const rawType = ow.type as any;
          const typeName = (rawType === OverwriteType.Role || rawType === 'role' || rawType === 0) ? 'Role' : 'Member';
          const allowText = formatPermissions(ow.allow);
          const denyText = formatPermissions(ow.deny);
          return `- **[${typeName}] ID: \`${ow.id}\`**\n  • Allow: ${allowText}\n  • Deny: ${denyText}`;
        });

        return {
          content: [{
            type: 'text',
            text: `**Permission Overwrites for #${guildChannel.name} (${overwrites.size}):**\n\n${lines.join('\n\n')}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list channel permissions: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'upsert_role_channel_permissions',
    'Create or update channel permission overwrite for a role',
    {
      channelId: z.string().describe('Channel ID'),
      roleId: z.string().describe('Role ID'),
      allowRaw: z.string().optional().describe('Allowed permissions raw bitfield string'),
      denyRaw: z.string().optional().describe('Denied permissions raw bitfield string'),
      allowPermissions: z.string().optional().describe('CSV of allowed permission names (e.g. ViewChannel,SendMessages)'),
      denyPermissions: z.string().optional().describe('CSV of denied permission names'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, roleId, allowRaw, denyRaw, allowPermissions, denyPermissions, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('permissionOverwrites' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        const allow = parsePermissionsInput(allowRaw, allowPermissions);
        const deny = parsePermissionsInput(denyRaw, denyPermissions);

        const permsObj: Record<string, boolean> = {};
        for (const flag of allow.toArray()) {
          permsObj[toCanonicalFlag(flag)] = true;
        }
        for (const flag of deny.toArray()) {
          permsObj[toCanonicalFlag(flag)] = false;
        }

        await humanPace(1200, 2200);

        if (typeof guildChannel.permissionOverwrites.edit === 'function') {
          await guildChannel.permissionOverwrites.edit(roleId, permsObj, { reason });
        } else if (typeof (guildChannel.permissionOverwrites as any).create === 'function') {
          await (guildChannel.permissionOverwrites as any).create(roleId, permsObj, { reason });
        } else if (typeof (guildChannel.permissionOverwrites as any).set === 'function') {
          await (guildChannel.permissionOverwrites as any).set([{ id: roleId, allow: allow.bitfield, deny: deny.bitfield }]);
        }

        return {
          content: [{
            type: 'text',
            text: `Successfully updated permission overwrite for role \`${roleId}\` on #${guildChannel.name}.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit role permissions: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'upsert_member_channel_permissions',
    'Create or update channel permission overwrite for an individual member',
    {
      channelId: z.string().describe('Channel ID'),
      userId: z.string().describe('Member User ID'),
      allowRaw: z.string().optional().describe('Allowed permissions raw bitfield string'),
      denyRaw: z.string().optional().describe('Denied permissions raw bitfield string'),
      allowPermissions: z.string().optional().describe('CSV of allowed permission names'),
      denyPermissions: z.string().optional().describe('CSV of denied permission names'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, userId, allowRaw, denyRaw, allowPermissions, denyPermissions, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('permissionOverwrites' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        const allow = parsePermissionsInput(allowRaw, allowPermissions);
        const deny = parsePermissionsInput(denyRaw, denyPermissions);

        const permsObj: Record<string, boolean> = {};
        for (const flag of allow.toArray()) {
          permsObj[toCanonicalFlag(flag)] = true;
        }
        for (const flag of deny.toArray()) {
          permsObj[toCanonicalFlag(flag)] = false;
        }

        await humanPace(1200, 2200);

        await guildChannel.permissionOverwrites.edit(userId, permsObj, { reason });

        return {
          content: [{
            type: 'text',
            text: `Successfully updated permission overwrite for member \`${userId}\` on #${guildChannel.name}.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit member permissions: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_channel_permission',
    'Delete a permission overwrite for a role or member from a channel',
    {
      channelId: z.string().describe('Channel ID'),
      targetId: z.string().describe('Role ID or User ID of overwrite to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, targetId, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('permissionOverwrites' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found: ${channelId}` }] };
        }

        const guildChannel = channel as GuildChannel;
        await guildChannel.permissionOverwrites.delete(targetId, reason);

        return { content: [{ type: 'text', text: `Successfully deleted permission overwrite for \`${targetId}\` from #${guildChannel.name}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete permission overwrite: ${formatError(err)}` }] };
      }
    }
  );
}
