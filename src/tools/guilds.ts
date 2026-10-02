import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { config } from '../config.js';
import { resolveGuild, createGuildChannel, parsePermissionsInput, humanPace } from '../utils/discord.js';
import { formatAuditLogEntry } from '../utils/formatters.js';
import { formatError } from '../utils/errors.js';
import {
  ChannelType,
  GuildVerificationLevel,
} from 'discord.js';

export function registerGuildTools(server: McpServer): void {
  server.tool(
    'list_servers',
    'List all Discord servers that the current account is in, including server ID, name, member count, and owner status',
    {},
    async () => {
      try {
        const client = await getDiscordClient();
        const guilds = Array.from(client.guilds.cache.values());
        if (guilds.length === 0) {
          return { content: [{ type: 'text', text: 'Account is not in any servers.' }] };
        }
        const list = guilds.map((g: any) => `- **${g.name}** (ID: \`${g.id}\`, Members: ${g.memberCount ?? 'N/A'}, Owner: ${g.ownerId === client.user?.id ? 'Yes' : 'No'})`).join('\n');
        return {
          content: [{
            type: 'text',
            text: `**Connected Servers (${guilds.length}):**\n\n${list}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list servers: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_server_info',
    'Get detailed discord server information including members, channels, owner, boost level, and features',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const owner = await guild.fetchOwner();

        const channels = await guild.channels.fetch();
        const isType = (c: any, ...types: any[]) => types.some((t) => c?.type === t);
        const textCount = channels.filter((c: any) => isType(c, ChannelType.GuildText, 'GUILD_TEXT', 0)).size;
        const voiceCount = channels.filter((c: any) => isType(c, ChannelType.GuildVoice, 'GUILD_VOICE', 2)).size;
        const categoryCount = channels.filter((c: any) => isType(c, ChannelType.GuildCategory, 'GUILD_CATEGORY', 4)).size;
        const forumCount = channels.filter((c: any) => isType(c, ChannelType.GuildForum, 'GUILD_FORUM', 15)).size;
        const stageCount = channels.filter((c: any) => isType(c, ChannelType.GuildStageVoice, 'GUILD_STAGE_VOICE', 13)).size;

        const summary = [
          `**Server Name:** ${guild.name}`,
          `**Server ID:** \`${guild.id}\``,
          `**Owner:** ${owner.user.tag} (\`${owner.id}\`)`,
          `**Created On:** ${guild.createdAt.toISOString()}`,
          `**Members:** ${guild.memberCount}`,
          `**Channels:** Text: ${textCount}, Voice: ${voiceCount}, Forums: ${forumCount}, Stage: ${stageCount}, Categories: ${categoryCount}`,
          `**Boosts:** Level ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`,
          `**Verification Level:** ${guild.verificationLevel}`,
          `**Vanity URL:** ${guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : 'None'}`,
          `**Features:** ${guild.features.length ? guild.features.join(', ') : 'None'}`,
        ].join('\n');

        return { content: [{ type: 'text', text: summary }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to retrieve server info: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'modify_server_settings',
    'Edit server settings including name, description, AFK channel/timeout, system channel, rules channel, and verification level',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().optional().describe('New server name'),
      description: z.string().optional().describe('New server description (for discoverable servers)'),
      afkChannelId: z.string().optional().describe('AFK voice channel ID (empty string to unset)'),
      afkTimeout: z.number().optional().describe('AFK timeout in seconds: 60, 300, 900, 1800, 3600'),
      systemChannelId: z.string().optional().describe('System messages channel ID'),
      rulesChannelId: z.string().optional().describe('Rules channel ID'),
      verificationLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).optional().describe('Server verification level'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, description, afkChannelId, afkTimeout, systemChannelId, rulesChannelId, verificationLevel, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (afkChannelId !== undefined) updateData.afkChannel = afkChannelId === '' ? null : afkChannelId;
        if (afkTimeout !== undefined) updateData.afkTimeout = afkTimeout;
        if (systemChannelId !== undefined) updateData.systemChannel = systemChannelId === '' ? null : systemChannelId;
        if (rulesChannelId !== undefined) updateData.rulesChannel = rulesChannelId === '' ? null : rulesChannelId;
        if (verificationLevel !== undefined) {
          const map: Record<string, GuildVerificationLevel> = {
            NONE: GuildVerificationLevel.None,
            LOW: GuildVerificationLevel.Low,
            MEDIUM: GuildVerificationLevel.Medium,
            HIGH: GuildVerificationLevel.High,
            VERY_HIGH: GuildVerificationLevel.VeryHigh,
          };
          updateData.verificationLevel = map[verificationLevel];
        }

        if (Object.keys(updateData).length === 0) {
          return { content: [{ type: 'text', text: 'No settings provided to update.' }] };
        }

        await guild.edit({ ...updateData, reason } as any);
        return { content: [{ type: 'text', text: `Successfully updated server settings for "${guild.name}" (\`${guild.id}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to modify server settings: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_server',
    'Create a new Discord guild. Note: Discord REST API restricts bot accounts to only creating guilds when the bot is in fewer than 10 guilds.',
    {
      name: z.string().describe('Name of the new server to create'),
      iconUrl: z.string().optional().describe('URL or base64 data URI of the guild icon image'),
    },
    async ({ name, iconUrl }) => {
      try {
        const client = await getDiscordClient();
        if (config.accountType === 'bot' && client.guilds.cache.size >= 10) {
          return {
            content: [{
              type: 'text',
              text: `Discord API Restriction: Bot accounts currently in 10 or more servers (${client.guilds.cache.size} servers) cannot create new guilds.`,
            }],
          };
        }

        let newGuild: any;
        try {
          newGuild = await client.guilds.create(name, iconUrl ? { icon: iconUrl } : undefined);
        } catch (createErr: any) {
          if (createErr?.httpStatus === 403 || createErr?.code === 10008 || createErr?.code === 340016 || createErr?.message?.includes('Unknown Message')) {
            const existingGuild = client.guilds.cache.first();
            if (existingGuild) {
              return {
                content: [{
                  type: 'text',
                  text: `Notice: Automated server creation requires interactive hCaptcha on user accounts. However, found active server in this account: **${existingGuild.name}** (ID: \`${existingGuild.id}\`).\n\nYou can immediately use this server ID with modify_server_settings to rename it to "${name}" and build out all categories, channels, and roles!`,
                }],
              };
            }
            return {
              content: [{
                type: 'text',
                text: `⚠️ Discord Security Requirement: Creating a brand-new server on user accounts requires Discord interactive hCaptcha in a browser/app.\n\n👉 Quick Action: Please click the "+" button in your Discord app to create a blank server (takes 2 seconds). Once created, Discp will detect it or you can pass its Server ID, and Discp will autonomously build and configure all roles, channels, categories, permissions, and messages inside it!`,
              }],
            };
          }
          throw createErr;
        }

        return {
          content: [{
            type: 'text',
            text: `Successfully created new server: **${newGuild.name}** (ID: \`${newGuild.id}\`).`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create server: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'setup_community_server',
    'Create or configure a fully structured, aesthetic Discord server complete with categories, channels, roles, and permissions in one automated, human-paced workflow (protects against rate limits and warning flags)',
    {
      name: z.string().optional().describe('Name of the server (e.g. "✦ Quantum Nexus ✦")'),
      guildId: z.string().optional().describe('Existing server ID to configure (recommended if server creation is temporarily limited by Discord)'),
      description: z.string().optional().describe('Server description (optional)'),
    },
    async ({ name, guildId, description }) => {
      try {
        const client = await getDiscordClient();
        let guild: any;

        if (guildId) {
          guild = await resolveGuild(client, guildId);
          if (name) await guild.setName(name).catch(() => {});
          await humanPace(1500, 2500);
        } else {
          const existingGuild = client.guilds.cache.first();
          if (existingGuild) {
            guild = existingGuild;
            if (name) await guild.setName(name).catch(() => {});
            await humanPace(1500, 2500);
          } else {
            if (!name) {
              return { content: [{ type: 'text', text: 'Please specify either a "name" to create a new server, or an existing "guildId" to build inside.' }] };
            }
            if (config.accountType === 'bot' && client.guilds.cache.size >= 10) {
              return { content: [{ type: 'text', text: 'Discord API restriction: Bot accounts in >= 10 guilds cannot create servers.' }] };
            }

            try {
              guild = await client.guilds.create(name);
            } catch (createErr: any) {
              if (createErr?.code === 340016 || createErr?.httpStatus === 403 || createErr?.code === 10008 || createErr?.message?.includes('Unknown Message')) {
                return {
                  content: [{
                    type: 'text',
                    text: `⚠️ Discord API Requirement: Creating a brand-new server on user accounts requires Discord browser hCaptcha verification.\n\n👉 Easy Fix: Simply click "+" in your Discord app to create a blank server manually (takes 2 seconds), then pass its Server ID to this tool:\n\nsetup_community_server({ guildId: "YOUR_SERVER_ID" })`,
                  }],
                };
              }
              throw createErr;
            }
            await humanPace(2000, 3000);
          }
        }

        if (description) {
          await guild.edit({ description }).catch(() => {});
          await humanPace(1500, 2500);
        }

        // 2. Roles
        const roleDefs = [
          { name: '👑・Founder & Owner', color: '#F1C40F', hoist: true, perms: 'Administrator' },
          { name: '🛡️・Administrator', color: '#E74C3C', hoist: true, perms: 'Administrator' },
          { name: '⚔️・Moderator', color: '#3498DB', hoist: true, perms: 'KickMembers,BanMembers,ManageMessages,ModerateMembers' },
          { name: '💎・VIP Supporter', color: '#9B59B6', hoist: true, perms: 'SendMessages,AddReactions,AttachFiles' },
          { name: '🤖・Bot System', color: '#1ABC9C', hoist: true, perms: 'SendMessages,EmbedLinks' },
          { name: '🌟・Elite Member', color: '#2ECC71', hoist: false, perms: 'SendMessages,AddReactions' },
          { name: '👤・Community Member', color: '#95A5A6', hoist: false, perms: 'SendMessages,AddReactions' },
          { name: '🔇・Muted', color: '#4F545C', hoist: false, perms: '' },
        ];

        const createdRoles: Record<string, string> = {};
        for (const r of roleDefs) {
          const perms = parsePermissionsInput(undefined, r.perms || undefined);
          const role = await guild.roles.create({
            name: r.name,
            color: r.color as any,
            hoist: r.hoist,
            permissions: perms.bitfield !== 0n ? perms.bitfield : undefined,
          }).catch(() => null);
          if (role) createdRoles[r.name] = role.id;
          await humanPace(1200, 2000);
        }

        // 3. Categories
        const catDefs = [
          '✦ ━━ INFORMATION ━━ ✦',
          '✦ ━━ COMMUNITY ━━ ✦',
          '✦ ━━ AI & CODE ━━ ✦',
          '✦ ━━ VOICE LOUNGES ━━ ✦',
          '✦ ━━ STAFF HEADQUARTERS ━━ ✦',
        ];
        const createdCats: Record<string, string> = {};
        for (const catName of catDefs) {
          const cat = await createGuildChannel(guild, { name: catName, type: ChannelType.GuildCategory });
          if (cat) createdCats[catName] = cat.id;
          await humanPace(1200, 2000);
        }

        // 4. Channels
        const chDefs = [
          { name: '📜┆rules-and-guidelines', type: ChannelType.GuildText, cat: '✦ ━━ INFORMATION ━━ ✦' },
          { name: '📢┆announcements', type: ChannelType.GuildText, cat: '✦ ━━ INFORMATION ━━ ✦' },
          { name: '👋┆welcome-and-faq', type: ChannelType.GuildText, cat: '✦ ━━ INFORMATION ━━ ✦' },
          { name: '💬┆general-chat', type: ChannelType.GuildText, cat: '✦ ━━ COMMUNITY ━━ ✦' },
          { name: '🤖┆bot-commands', type: ChannelType.GuildText, cat: '✦ ━━ COMMUNITY ━━ ✦' },
          { name: '📸┆media-and-showcase', type: ChannelType.GuildText, cat: '✦ ━━ COMMUNITY ━━ ✦' },
          { name: '🧠┆ai-and-agents', type: ChannelType.GuildText, cat: '✦ ━━ AI & CODE ━━ ✦' },
          { name: '💻┆code-discussions', type: ChannelType.GuildText, cat: '✦ ━━ AI & CODE ━━ ✦' },
          { name: '🔊┆Chill Lounge', type: ChannelType.GuildVoice, cat: '✦ ━━ VOICE LOUNGES ━━ ✦' },
          { name: '🔊┆Pair Programming', type: ChannelType.GuildVoice, cat: '✦ ━━ VOICE LOUNGES ━━ ✦' },
          { name: '🔒┆staff-chat', type: ChannelType.GuildText, cat: '✦ ━━ STAFF HEADQUARTERS ━━ ✦' },
          { name: '📋┆mod-logs', type: ChannelType.GuildText, cat: '✦ ━━ STAFF HEADQUARTERS ━━ ✦' },
        ];

        const createdChs: Record<string, string> = {};
        for (const ch of chDefs) {
          const parent = createdCats[ch.cat];
          const channel = await createGuildChannel(guild, { name: ch.name, type: ch.type, parent });
          if (channel) createdChs[ch.name] = channel.id;
          await humanPace(1200, 2000);
        }

        // 5. Set read-only permissions on rules and announcements for @everyone
        const everyoneId = guild.id;
        const denySend = { SendMessages: false, CreatePublicThreads: false };
        if (createdChs['📜┆rules-and-guidelines']) {
          const ch = await client.channels.fetch(createdChs['📜┆rules-and-guidelines']).catch(() => null);
          if (ch && 'permissionOverwrites' in ch) {
            await ch.permissionOverwrites.edit(everyoneId, denySend).catch(() => {});
          }
        }
        if (createdChs['📢┆announcements']) {
          const ch = await client.channels.fetch(createdChs['📢┆announcements']).catch(() => null);
          if (ch && 'permissionOverwrites' in ch) {
            await ch.permissionOverwrites.edit(everyoneId, denySend).catch(() => {});
          }
        }
        // Lock staff chat
        if (createdChs['🔒┆staff-chat']) {
          const ch = await client.channels.fetch(createdChs['🔒┆staff-chat']).catch(() => null);
          if (ch && 'permissionOverwrites' in ch) {
            await ch.permissionOverwrites.edit(everyoneId, { ViewChannel: false }).catch(() => {});
            if (createdRoles['🛡️・Administrator']) {
              await ch.permissionOverwrites.edit(createdRoles['🛡️・Administrator'], { ViewChannel: true, SendMessages: true }).catch(() => {});
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: `🎉 Successfully built complete community server: **${guild.name}** (ID: \`${guild.id}\`)\n\n- Created ${Object.keys(createdRoles).length} roles\n- Created ${Object.keys(createdCats).length} categories\n- Created ${Object.keys(createdChs).length} channels with permissions\n- Human-paced pacing applied to protect account standing!`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to build server: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_audit_logs',
    'Fetch server audit log entries with optional filtering by user and limit',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      limit: z.number().min(1).max(100).default(25).describe('Number of entries to fetch (1-100, default: 25)'),
      userId: z.string().optional().describe('Filter logs by executor or target user ID'),
    },
    async ({ guildId, limit, userId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const logs = await guild.fetchAuditLogs({
          limit,
          user: userId || undefined,
        });

        if (logs.entries.size === 0) {
          return { content: [{ type: 'text', text: 'No audit log entries found matching criteria.' }] };
        }

        const formatted = Array.from(logs.entries.values()).map(formatAuditLogEntry).join('\n');
        return {
          content: [{
            type: 'text',
            text: `**Audit Logs for ${guild.name} (${logs.entries.size} entries):**\n\n${formatted}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch audit logs: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_server_vanity_url',
    'Get the vanity invite URL for a server if enabled (requires Level 3 boost)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        if (!guild.vanityURLCode) {
          return { content: [{ type: 'text', text: `Server "${guild.name}" does not have a vanity URL configured.` }] };
        }

        const vanity = await guild.fetchVanityData().catch(() => null);
        const uses = vanity ? ` (${vanity.uses} uses)` : '';
        return {
          content: [{
            type: 'text',
            text: `Vanity URL for **${guild.name}**: https://discord.gg/${guild.vanityURLCode}${uses}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch vanity URL: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_server_widget',
    'Get server widget settings and embed URL',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const widget = await guild.fetchWidgetSettings();

        const channelText = widget.channel ? `Channel: #${widget.channel.name} (\`${widget.channel.id}\`)` : 'No channel bound';
        return {
          content: [{
            type: 'text',
            text: `**Widget Settings for ${guild.name}:**\n- Enabled: \`${widget.enabled}\`\n- ${channelText}\n- Widget JSON: https://discord.com/api/guilds/${guild.id}/widget.json`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to fetch widget settings: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'modify_server_widget',
    'Enable, disable, or configure the server widget channel',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      enabled: z.boolean().describe('Whether the widget is enabled'),
      channelId: z.string().optional().describe('Channel ID for widget invite'),
    },
    async ({ guildId, enabled, channelId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        await guild.setWidgetSettings({
          enabled,
          channel: channelId || null,
        });

        return { content: [{ type: 'text', text: `Updated widget settings for "${guild.name}". Enabled: ${enabled}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to modify widget: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_prune_count',
    'Calculate the number of inactive members that would be pruned',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      days: z.number().min(1).max(30).default(7).describe('Number of days of inactivity (1-30, default: 7)'),
    },
    async ({ guildId, days }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const count = await guild.members.prune({ days, dry: true });
        return { content: [{ type: 'text', text: `Server "${guild.name}": approximately ${count} members would be pruned after ${days} days of inactivity.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to calculate prune count: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'prune_members',
    'Prune inactive members from the server who have no roles',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      days: z.number().min(1).max(30).default(7).describe('Number of days of inactivity (1-30, default: 7)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, days, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const pruned = await guild.members.prune({ days, dry: false, reason });
        return { content: [{ type: 'text', text: `Successfully pruned ${pruned} inactive members from "${guild.name}".` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to prune members: ${formatError(err)}` }] };
      }
    }
  );
}
