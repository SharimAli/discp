import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, resolveMember } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerVoiceTools(server: McpServer): void {
  server.tool(
    'move_voice_member',
    'Move a member to another voice or stage channel (they must currently be connected to voice)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Target User ID'),
      channelId: z.string().describe('Target voice/stage channel ID'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, channelId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        if (!member.voice.channel) {
          return { content: [{ type: 'text', text: `User ${member.user.tag} is not currently connected to any voice channel.` }] };
        }

        await member.voice.setChannel(channelId, reason);
        return { content: [{ type: 'text', text: `Successfully moved ${member.user.tag} to channel \`${channelId}\`.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to move voice member: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'disconnect_voice_member',
    'Disconnect a member from their current voice channel',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Target User ID'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        if (!member.voice.channel) {
          return { content: [{ type: 'text', text: `User ${member.user.tag} is not in a voice channel.` }] };
        }

        await member.voice.disconnect(reason);
        return { content: [{ type: 'text', text: `Disconnected ${member.user.tag} from voice.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to disconnect voice member: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'modify_voice_state',
    'Server mute or deafen a member in voice channels across the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Target User ID'),
      mute: z.boolean().optional().describe('Server mute microphone'),
      deafen: z.boolean().optional().describe('Server deafen audio'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, mute, deafen, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        if (!member.voice.channel) {
          return { content: [{ type: 'text', text: `User ${member.user.tag} is not connected to a voice channel.` }] };
        }

        if (mute === undefined && deafen === undefined) {
          return { content: [{ type: 'text', text: 'Provide at least one of mute or deafen.' }] };
        }

        if (mute !== undefined) await member.voice.setMute(mute, reason);
        if (deafen !== undefined) await member.voice.setDeaf(deafen, reason);

        return {
          content: [{
            type: 'text',
            text: `Updated voice state for ${member.user.tag}: Muted=${mute ?? member.voice.serverMute}, Deafened=${deafen ?? member.voice.serverDeaf}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to modify voice state: ${formatError(err)}` }] };
      }
    }
  );
}
