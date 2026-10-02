import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, resolveMember, parsePermissionsInput, formatPermissions } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { ColorResolvable } from 'discord.js';

export function registerRoleTools(server: McpServer): void {
  server.tool(
    'list_roles',
    'List all roles in a server with ID, color, position, and permission summaries',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const roles = await guild.roles.fetch();

        const sorted = Array.from(roles.values()).sort((a, b) => b.position - a.position);
        const lines = sorted.map((r) => {
          return `- **${r.name}** (ID: \`${r.id}\`)\n  • Position: ${r.position}\n  • Color: ${r.hexColor}\n  • Hoisted: ${r.hoist}\n  • Mentionable: ${r.mentionable}\n  • Permissions: ${formatPermissions(r.permissions)}`;
        });

        return { content: [{ type: 'text', text: `**Roles in ${guild.name} (${roles.size}):**\n\n${lines.join('\n\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list roles: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_role_info',
    'Get detailed information about a specific role',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      roleId: z.string().describe('Role ID'),
    },
    async ({ guildId, roleId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) return { content: [{ type: 'text', text: `Role ID \`${roleId}\` not found in ${guild.name}.` }] };

        const lines = [
          `**Name:** ${role.name}`,
          `**ID:** \`${role.id}\``,
          `**Color:** ${role.hexColor}`,
          `**Position:** ${role.position}`,
          `**Hoisted:** ${role.hoist}`,
          `**Mentionable:** ${role.mentionable}`,
          `**Managed (Bot/Integration):** ${role.managed}`,
          `**Members with role:** ${role.members.size}`,
          `**Permissions:** ${formatPermissions(role.permissions)}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get role info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_role',
    'Create a new role on the server with custom properties',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Role name'),
      color: z.string().optional().describe('Hex color string (e.g. "#FF0000") or integer'),
      hoist: z.boolean().optional().describe('Display role separately in member list'),
      mentionable: z.boolean().optional().describe('Allow anyone to mention this role'),
      permissionsRaw: z.string().optional().describe('Permission bitfield string'),
      permissionsNames: z.string().optional().describe('CSV of permission names'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, color, hoist, mentionable, permissionsRaw, permissionsNames, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const permissions = parsePermissionsInput(permissionsRaw, permissionsNames);
        const role = await guild.roles.create({
          name,
          color: color as ColorResolvable | undefined,
          hoist: hoist || false,
          mentionable: mentionable || false,
          permissions: permissions.bitfield !== 0n ? permissions.bitfield : undefined,
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Successfully created role **${role.name}** (ID: \`${role.id}\`, Color: ${role.hexColor}).`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create role: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_role',
    'Edit an existing role settings and permissions',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      roleId: z.string().describe('Role ID to edit'),
      name: z.string().optional().describe('New name'),
      color: z.string().optional().describe('New hex color string (e.g. "#00FF00")'),
      hoist: z.boolean().optional().describe('Display role separately in sidebar'),
      mentionable: z.boolean().optional().describe('Allow anyone to mention role'),
      position: z.number().optional().describe('Role position index'),
      permissionsRaw: z.string().optional().describe('Permission bitfield string'),
      permissionsNames: z.string().optional().describe('CSV of permission names'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, roleId, name, color, hoist, mentionable, position, permissionsRaw, permissionsNames, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) return { content: [{ type: 'text', text: `Role ID \`${roleId}\` not found.` }] };

        const editData: Record<string, unknown> = {};
        if (name !== undefined) editData.name = name;
        if (color !== undefined) editData.color = color as ColorResolvable;
        if (hoist !== undefined) editData.hoist = hoist;
        if (mentionable !== undefined) editData.mentionable = mentionable;
        if (position !== undefined) editData.position = position;

        if (permissionsRaw !== undefined || permissionsNames !== undefined) {
          editData.permissions = parsePermissionsInput(permissionsRaw, permissionsNames);
        }

        await role.edit({ ...editData, reason } as any);
        return { content: [{ type: 'text', text: `Successfully updated role **${role.name}** (ID: \`${role.id}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit role: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_role',
    'Permanently delete a role from the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      roleId: z.string().describe('Role ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, roleId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) return { content: [{ type: 'text', text: `Role ID \`${roleId}\` not found.` }] };

        const name = role.name;
        await role.delete(reason);
        return { content: [{ type: 'text', text: `Successfully deleted role **${name}** (ID: \`${roleId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete role: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'assign_role',
    'Assign a role to a user in the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Target User ID'),
      roleId: z.string().describe('Role ID to assign'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, roleId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);
        const role = await guild.roles.fetch(roleId);
        if (!role) return { content: [{ type: 'text', text: `Role ID \`${roleId}\` not found.` }] };

        await member.roles.add(role, reason);
        return { content: [{ type: 'text', text: `Assigned role **${role.name}** to ${member.user.tag}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to assign role: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'remove_role',
    'Remove a role from a user in the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      userId: z.string().describe('Target User ID'),
      roleId: z.string().describe('Role ID to remove'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, userId, roleId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const member = await resolveMember(guild, userId);
        const role = await guild.roles.fetch(roleId);
        if (!role) return { content: [{ type: 'text', text: `Role ID \`${roleId}\` not found.` }] };

        await member.roles.remove(role, reason);
        return { content: [{ type: 'text', text: `Removed role **${role.name}** from ${member.user.tag}.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to remove role: ${formatError(err)}` }] };
      }
    }
  );
}
