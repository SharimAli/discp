import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, resolveMember } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerModerationTools(server: McpServer): void {
  server.tool(
    'kick_member',
    'Kick a member from the server. They can rejoin if an invite is available.',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('User ID to kick'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        await member.kick(reason);
        return { content: [{ type: 'text', text: `Successfully kicked ${member.user.tag} (\`${userId}\`) from ${guild.name}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to kick member: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'ban_member',
    'Ban a user from the server and optionally purge recent messages (0 to 604800 seconds = 7 days)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('User ID to ban'),
      deleteMessageSeconds: z.number().min(0).max(604800).optional().describe('Number of seconds of message history to purge (max: 604800 = 7 days)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, deleteMessageSeconds, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        await guild.members.ban(userId, {
          deleteMessageSeconds: deleteMessageSeconds || 0,
          reason,
        });

        return { content: [{ type: 'text', text: `Successfully banned user ID \`${userId}\` from ${guild.name}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to ban user: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'unban_member',
    'Remove a ban from a user, allowing them to rejoin',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('User ID to unban'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        await guild.members.unban(userId, reason);
        return { content: [{ type: 'text', text: `Successfully unbanned user ID \`${userId}\` in ${guild.name}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to unban user: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'timeout_member',
    'Place a member in timeout (mute/communication disabled) for up to 28 days (2419200 seconds)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Member User ID'),
      durationSeconds: z.number().min(1).max(2419200).describe('Duration in seconds (1 to 2419200 = 28 days)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, durationSeconds, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        await member.timeout(durationSeconds * 1000, reason);
        return { content: [{ type: 'text', text: `Timed out ${member.user.tag} (\`${userId}\`) for ${durationSeconds} seconds.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to timeout member: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'remove_timeout',
    'Remove an active timeout from a member',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Member User ID'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        await member.timeout(null, reason);
        return { content: [{ type: 'text', text: `Removed timeout from ${member.user.tag} (\`${userId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to remove timeout: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'set_member_nickname',
    'Change a member nickname in the server (empty string resets to original username)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Member User ID'),
      nickname: z.string().optional().describe('New nickname (leave empty or null to reset)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, nickname, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        await member.setNickname(nickname || null, reason);
        return { content: [{ type: 'text', text: `Successfully updated nickname for ${member.user.tag} to "${nickname || '[Reset]'}"` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to set nickname: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_bans',
    'List banned users from the server with ban reasons',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      limit: z.number().min(1).max(100).default(50).describe('Max results to return (1-100, default: 50)'),
    },
    async ({ guildId, limit }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const bans = await guild.bans.fetch({ limit });
        if (bans.size === 0) {
          return { content: [{ type: 'text', text: `No banned users found on ${guild.name}.` }] };
        }

        const lines = bans.map((b) => `- **${b.user.tag}** (\`${b.user.id}\`) — Reason: ${b.reason || 'None specified'}`);
        return { content: [{ type: 'text', text: `**Bans in ${guild.name} (${bans.size}):**\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list bans: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_ban_info',
    'Get detailed ban information for a specific banned user',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Banned User ID'),
    },
    async ({ guildId, userId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const ban = await guild.bans.fetch(userId);
        return {
          content: [{
            type: 'text',
            text: `**Ban Details for ${ban.user.tag} (\`${ban.user.id}\`):**\n- Reason: ${ban.reason || 'None specified'}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch ban info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_members',
    'List members of the server with roles and join dates',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      limit: z.number().min(1).max(100).default(50).describe('Max members to fetch (1-100, default: 50)'),
    },
    async ({ guildId, limit }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        let members: any[] = [];
        if (guild.members.cache.size > 0) {
          members = Array.from(guild.members.cache.values()).slice(0, limit);
        } else {
          try {
            const fetched = await Promise.race([
              guild.members.fetch(),
              new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
            ]);
            if (fetched && 'values' in (fetched as any)) {
              members = Array.from((fetched as any).values()).slice(0, limit);
            }
          } catch {
            members = Array.from(guild.members.cache.values()).slice(0, limit);
          }
        }

        if (members.length === 0) {
          const selfMember = guild.members.me || (guild as any).me;
          if (selfMember) members.push(selfMember);
        }

        const lines = members.map((m: any) => {
          const roles = m.roles?.cache ? Array.from(m.roles.cache.values()).filter((r: any) => r.id !== guild.id).map((r: any) => r.name).join(', ') : 'No roles';
          const tag = m.user?.tag || m.user?.username || m.id;
          return `- **${tag}** (\`${m.id}\`) ${m.nickname ? `[aka ${m.nickname}]` : ''}: Roles: [${roles || 'No roles'}]`;
        });

        return { content: [{ type: 'text', text: `**Members in ${guild.name} (${members.length}):**\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list members: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'search_members',
    'Search for members in a server by username or nickname prefix',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      query: z.string().describe('Query string to match names against'),
      limit: z.number().min(1).max(100).default(20).describe('Max results (1-100, default: 20)'),
    },
    async ({ guildId, query, limit }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const members = await guild.members.search({ query, limit });
        if (members.size === 0) {
          return { content: [{ type: 'text', text: `No members found matching "${query}" in ${guild.name}.` }] };
        }

        const lines = members.map((m) => `- **${m.user.tag}** (\`${m.id}\`) ${m.nickname ? `[aka ${m.nickname}]` : ''}`);
        return { content: [{ type: 'text', text: `**Found ${members.size} member(s):**\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to search members: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_member_info',
    'Get detailed information about a member in a server (roles, join date, voice state, permissions)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Member User ID'),
    },
    async ({ guildId, userId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);

        const roles = member.roles.cache.filter((r) => r.id !== guild.id).map((r) => `${r.name} (\`${r.id}\`)`).join(', ') || 'None';
        const lines = [
          `**User:** ${member.user.tag} (\`${member.id}\`)`,
          `**Nickname:** ${member.nickname || 'None'}`,
          `**Bot:** ${member.user.bot}`,
          `**Joined Server:** ${member.joinedAt?.toISOString() || 'Unknown'}`,
          `**Account Created:** ${member.user.createdAt.toISOString()}`,
          `**Roles:** ${roles}`,
          `**Voice Channel:** ${member.voice.channel ? `#${member.voice.channel.name}` : 'Not connected'}`,
          `**Server Muted/Deafened:** Muted: ${member.voice.serverMute ?? false}, Deafened: ${member.voice.serverDeaf ?? false}`,
          `**Timed Out Until:** ${member.communicationDisabledUntil?.toISOString() || 'None'}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get member info: ${formatError(err)}` }] };
      }
    }
  );
}
