import { Message, GuildAuditLogsEntry, GuildScheduledEvent, AutoModerationRule } from 'discord.js';
import { formatBytes } from './discord.js';

/**
 * Formats a list of Discord messages into structured markdown.
 */
export function formatMessageList(messages: Message[]): string {
  if (messages.length === 0) return 'No messages found.';

  return messages
    .map((msg) => {
      const author = msg?.author ? (msg.author.tag || msg.author.username || 'Unknown') : 'System';
      const timestamp = msg?.createdAt ? msg.createdAt.toISOString() : 'Unknown';
      const content = msg?.cleanContent || msg?.content || (msg?.embeds?.length ? '[Embed content]' : '[Empty content]');

      let output = `- (ID: \`${msg.id}\`) **[${author}]** \`${timestamp}\`:\n  ${content}`;

      if (msg?.attachments && msg.attachments.size > 0) {
        output += '\n  Attachments:';
        msg.attachments.forEach((att: any) => {
          output += `\n    - [${att.name}](${att.url}) (${formatBytes(att.size)}, ${att.contentType || 'unknown'})`;
        });
      }

      return output;
    })
    .join('\n\n');
}

/**
 * Formats an audit log entry with target and changes details.
 */
export function formatAuditLogEntry(entry: GuildAuditLogsEntry): string {
  const executor = entry.executor?.tag || 'System / Webhook';
  const reason = entry.reason ? ` (Reason: "${entry.reason}")` : '';
  const timestamp = entry.createdAt.toISOString();

  let details = `- [${timestamp}] **${entry.action}** by **${executor}** on target **${entry.targetId}**${reason}`;

  if (entry.changes && entry.changes.length > 0) {
    const changesText = entry.changes
      .map((c) => `\`${c.key}\`: ${JSON.stringify(c.old)} ➔ ${JSON.stringify(c.new)}`)
      .join(', ');
    details += `\n    Changes: ${changesText}`;
  }

  return details;
}

/**
 * Formats a scheduled event into bulleted summary.
 */
export function formatScheduledEvent(event: GuildScheduledEvent): string {
  const channelInfo = event.channel ? ` in #${event.channel.name}` : (event.entityMetadata?.location ? ` at ${event.entityMetadata.location}` : '');
  const interested = event.userCount ? ` (${event.userCount} interested)` : '';
  return `- **${event.name}** (ID: \`${event.id}\`): Status \`${event.status}\`${channelInfo}, Starts: ${event.scheduledStartAt?.toISOString()}${interested}`;
}

/**
 * Formats an AutoModeration rule summary.
 */
export function formatAutoModRule(rule: AutoModerationRule): string {
  const actions = rule.actions.map((a) => a.type).join(', ');
  const status = rule.enabled ? 'Enabled' : 'Disabled';
  return `- **${rule.name}** (ID: \`${rule.id}\`): Trigger \`${rule.triggerType}\`, Status \`${status}\`, Actions: [${actions}]`;
}

/**
 * Formats a channel type cleanly across both Discord.js v14 and selfbot v13 formats.
 */
export function formatChannelType(type: any): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'number') {
    const ChannelTypeMap: Record<number, string> = {
      0: 'GUILD_TEXT',
      1: 'DM',
      2: 'GUILD_VOICE',
      3: 'GROUP_DM',
      4: 'GUILD_CATEGORY',
      5: 'GUILD_ANNOUNCEMENT',
      10: 'ANNOUNCEMENT_THREAD',
      11: 'PUBLIC_THREAD',
      12: 'PRIVATE_THREAD',
      13: 'GUILD_STAGE_VOICE',
      14: 'GUILD_DIRECTORY',
      15: 'GUILD_FORUM',
      16: 'GUILD_MEDIA',
    };
    return ChannelTypeMap[type] || `TYPE_${type}`;
  }
  return String(type || 'UNKNOWN');
}

