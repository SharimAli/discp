import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { GuildChannel } from 'discord.js';

export function registerInviteTools(server: McpServer): void {
  server.tool(
    'create_invite',
    'Create an invite link for a channel with custom expiration and usage limits',
    {
      channelId: z.string().describe('Channel ID where invite points to'),
      maxAge: z.number().min(0).default(86400).describe('Duration before expiry in seconds (0 = never, default: 86400 = 24h)'),
      maxUses: z.number().min(0).default(0).describe('Max number of uses (0 = unlimited)'),
      temporary: z.boolean().default(false).describe('Grant temporary membership (kicked upon disconnect unless role assigned)'),
      unique: z.boolean().default(false).describe('Force unique invite code creation'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, maxAge, maxUses, temporary, unique, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('createInvite' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found or does not support invites: ${channelId}` }] };
        }

        const invite = await (channel as any).createInvite({
          maxAge,
          maxUses,
          temporary,
          unique,
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Created invite: https://discord.gg/${invite.code}\n- Code: \`${invite.code}\`\n- Max Age: ${invite.maxAge === 0 ? 'Never' : `${invite.maxAge}s`}\n- Max Uses: ${invite.maxUses === 0 ? 'Unlimited' : invite.maxUses}\n- Temporary: ${invite.temporary}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create invite: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_invites',
    'List all active invites for the server with statistics',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const invites = await guild.invites.fetch();
        if (invites.size === 0) {
          return { content: [{ type: 'text', text: `No active invites found on ${guild.name}.` }] };
        }

        const lines = invites.map((inv) => {
          const inviter = inv.inviter ? inv.inviter.tag : 'Unknown';
          const channel = inv.channel ? `#${inv.channel.name}` : 'Unknown';
          return `- **discord.gg/${inv.code}** for ${channel} (Created by: ${inviter}, Uses: ${inv.uses}/${inv.maxUses || '∞'}, Expire: ${inv.maxAge === 0 ? 'Never' : `${inv.maxAge}s`})`;
        });

        return { content: [{ type: 'text', text: `**Active Invites on ${guild.name} (${invites.size}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list invites: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_invite',
    'Revoke/delete an invite link so it can no longer be used',
    {
      inviteCode: z.string().describe('Invite code or full invite URL (e.g. "abcXYZ" or "https://discord.gg/abcXYZ")'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ inviteCode, reason }) => {
      try {
        const client = await getDiscordClient();
        const code = inviteCode.replace(/(https?:\/\/)?(www\.)?(discord\.gg\/|discord\.com\/invite\/)/, '').trim();

        const invite = await client.fetchInvite(code);
        await invite.delete(reason);

        return { content: [{ type: 'text', text: `Successfully deleted invite: \`${code}\`.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete invite: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_invite_details',
    'Get details about an invite code (channel, server, online member counts)',
    {
      inviteCode: z.string().describe('Invite code or full URL'),
      withCounts: z.boolean().default(true).describe('Include approximate online and total member counts'),
    },
    async ({ inviteCode, withCounts }) => {
      try {
        const client = await getDiscordClient();
        const code = inviteCode.replace(/(https?:\/\/)?(www\.)?(discord\.gg\/|discord\.com\/invite\/)/, '').trim();

        const invite = await client.fetchInvite(code);
        const lines = [
          `**Code:** \`${invite.code}\``,
          `**Server:** ${invite.guild?.name || 'Unknown'} (\`${invite.guild?.id || 'N/A'}\`)`,
          `**Channel:** ${invite.channel?.name || 'Unknown'} (\`${invite.channel?.id || 'N/A'}\`)`,
          `**Inviter:** ${invite.inviter?.tag || 'Unknown'}`,
          `**Members Total:** ${invite.memberCount ?? 'N/A'}`,
          `**Members Online:** ${invite.presenceCount ?? 'N/A'}`,
          `**Expires At:** ${invite.expiresAt ? invite.expiresAt.toISOString() : 'Never'}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch invite details: ${formatError(err)}` }] };
      }
    }
  );
}
