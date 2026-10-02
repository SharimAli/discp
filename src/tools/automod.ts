import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild } from '../utils/discord.js';
import { formatAutoModRule } from '../utils/formatters.js';
import { formatError } from '../utils/errors.js';
import {
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
  AutoModerationAction,
} from 'discord.js';

export function registerAutoModTools(server: McpServer): void {
  server.tool(
    'list_automod_rules',
    'List all AutoModeration rules configured on the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ guildId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const rules = await guild.autoModerationRules.fetch();
        if (rules.size === 0) {
          return { content: [{ type: 'text', text: `No AutoMod rules configured on ${guild.name}.` }] };
        }

        const lines = Array.from(rules.values()).map(formatAutoModRule).join('\n');
        return { content: [{ type: 'text', text: `**AutoMod Rules on ${guild.name} (${rules.size}):**\n\n${lines}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list AutoMod rules: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_automod_rule',
    'Get detailed configuration of a specific AutoModeration rule',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      ruleId: z.string().describe('AutoMod Rule ID'),
    },
    async ({ guildId, ruleId }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        const rule = await guild.autoModerationRules.fetch(ruleId);
        const lines = [
          `**Name:** ${rule.name}`,
          `**ID:** \`${rule.id}\``,
          `**Enabled:** ${rule.enabled}`,
          `**Trigger Type:** ${rule.triggerType}`,
          `**Event Type:** ${rule.eventType}`,
          `**Keyword Filter:** ${rule.triggerMetadata.keywordFilter ? rule.triggerMetadata.keywordFilter.join(', ') : 'None'}`,
          `**Regex Patterns:** ${rule.triggerMetadata.regexPatterns ? rule.triggerMetadata.regexPatterns.join(', ') : 'None'}`,
          `**Mention Total Limit:** ${rule.triggerMetadata.mentionTotalLimit ?? 'N/A'}`,
          `**Exempt Roles:** ${rule.exemptRoles.size}`,
          `**Exempt Channels:** ${rule.exemptChannels.size}`,
          `**Actions:** ${rule.actions.map((a) => a.type).join(', ')}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get AutoMod rule: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'create_automod_rule',
    'Create a new AutoModeration rule (e.g. block bad words, spam, or mention raids)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      name: z.string().describe('Rule name'),
      triggerType: z.enum(['KEYWORD', 'SPAM', 'MENTION_SPAM']).default('KEYWORD').describe('Rule trigger type'),
      keywordsCsv: z.string().optional().describe('Comma-separated list of keywords to match (for KEYWORD trigger)'),
      regexPatternsCsv: z.string().optional().describe('Comma-separated list of regex patterns'),
      mentionLimit: z.number().optional().describe('Max allowed unique mentions (for MENTION_SPAM trigger)'),
      blockMessage: z.boolean().default(true).describe('Whether to block the triggering message'),
      alertChannelId: z.string().optional().describe('Channel ID to send an alert log message to'),
      timeoutSeconds: z.number().min(1).max(2419200).optional().describe('Timeout user for N seconds (up to 28 days)'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, name, triggerType, keywordsCsv, regexPatternsCsv, mentionLimit, blockMessage, alertChannelId, timeoutSeconds, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);

        let typeVal = AutoModerationRuleTriggerType.Keyword;
        if (triggerType === 'SPAM') typeVal = AutoModerationRuleTriggerType.Spam;
        if (triggerType === 'MENTION_SPAM') typeVal = AutoModerationRuleTriggerType.MentionSpam;

        const actions: AutoModerationAction[] = [];
        if (blockMessage) {
          actions.push({ type: AutoModerationActionType.BlockMessage } as any);
        }
        if (alertChannelId) {
          actions.push({
            type: AutoModerationActionType.SendAlertMessage,
            metadata: { channel: alertChannelId },
          } as any);
        }
        if (timeoutSeconds) {
          actions.push({
            type: AutoModerationActionType.Timeout,
            metadata: { durationSeconds: timeoutSeconds },
          } as any);
        }

        const rule = await guild.autoModerationRules.create({
          name,
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: typeVal,
          triggerMetadata: {
            keywordFilter: keywordsCsv ? keywordsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            regexPatterns: regexPatternsCsv ? regexPatternsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            mentionTotalLimit: mentionLimit,
          },
          actions,
          enabled: true,
          reason,
        });

        return {
          content: [{
            type: 'text',
            text: `Successfully created AutoMod rule: **${rule.name}** (ID: \`${rule.id}\`).`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create AutoMod rule: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'edit_automod_rule',
    'Edit an existing AutoModeration rule (name or toggle enabled state)',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      ruleId: z.string().describe('Rule ID to edit'),
      name: z.string().optional().describe('New name'),
      enabled: z.boolean().optional().describe('Enable or disable rule'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, ruleId, name, enabled, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const rule = await guild.autoModerationRules.fetch(ruleId);

        await rule.edit({
          name: name || undefined,
          enabled: enabled !== undefined ? enabled : undefined,
          reason,
        });

        return { content: [{ type: 'text', text: `Successfully updated AutoMod rule: **${rule.name}** (\`${rule.id}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to edit AutoMod rule: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_automod_rule',
    'Permanently delete an AutoModeration rule from the server',
    {
      guildId: z.string().optional().describe('Discord server ID (defaults to DISCORD_GUILD_ID)'),
      ruleId: z.string().describe('Rule ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ guildId, ruleId, reason }) => {
      try {
        const client = await getDiscordClient();
        const guild = await resolveGuild(client, guildId);
        const rule = await guild.autoModerationRules.fetch(ruleId);

        const name = rule.name;
        await rule.delete(reason);
        return { content: [{ type: 'text', text: `Successfully deleted AutoMod rule: **${name}** (\`${ruleId}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete AutoMod rule: ${formatError(err)}` }] };
      }
    }
  );
}
