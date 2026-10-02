import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveGuild, humanPace } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';
import { TextChannel, WebhookClient } from 'discord.js';

export function registerWebhookTools(server: McpServer): void {
  server.tool(
    'create_webhook',
    'Create a new webhook on a specific text channel',
    {
      channelId: z.string().describe('Channel ID'),
      name: z.string().describe('Webhook name'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ channelId, name, reason }) => {
      try {
        const client = await getDiscordClient();
        const channel = await client.channels.fetch(channelId);
        if (!channel || !('createWebhook' in channel)) {
          return { content: [{ type: 'text', text: `Channel not found or does not support webhooks: ${channelId}` }] };
        }

        await humanPace(1200, 2200);

        let webhook: any;
        try {
          webhook = await (channel as any).createWebhook(name, { reason });
        } catch {
          webhook = await (channel as any).createWebhook({ name, reason });
        }

        return {
          content: [{
            type: 'text',
            text: `Created webhook: **${webhook.name}**\n- ID: \`${webhook.id}\`\n- URL: ${webhook.url}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create webhook: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'delete_webhook',
    'Delete a webhook by ID',
    {
      webhookId: z.string().describe('Webhook ID to delete'),
      reason: z.string().optional().describe('Audit log reason'),
    },
    async ({ webhookId, reason }) => {
      try {
        const client = await getDiscordClient();
        const webhook = await client.fetchWebhook(webhookId);

        await webhook.delete(reason);
        return { content: [{ type: 'text', text: `Successfully deleted webhook \`${webhookId}\`.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to delete webhook: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'list_webhooks',
    'List all webhooks configured on a specific channel or across a whole server',
    {
      channelId: z.string().optional().describe('Channel ID to list webhooks for'),
      guildId: z.string().optional().describe('Server ID to list all webhooks for (defaults to DISCORD_GUILD_ID)'),
    },
    async ({ channelId, guildId }) => {
      try {
        const client = await getDiscordClient();
        let webhooks: any;

        if (channelId) {
          const channel = await client.channels.fetch(channelId);
          if (!channel || !('fetchWebhooks' in channel)) {
            return { content: [{ type: 'text', text: `Channel not found or does not support webhooks: ${channelId}` }] };
          }
          webhooks = await (channel as any).fetchWebhooks();
        } else {
          const guild = await resolveGuild(client, guildId);
          webhooks = await guild.fetchWebhooks();
        }

        if (!webhooks || webhooks.size === 0) {
          return { content: [{ type: 'text', text: 'No webhooks found.' }] };
        }

        const lines = webhooks.map((w: any) => `- **${w.name}** (ID: \`${w.id}\`): ${w.url}`);
        return { content: [{ type: 'text', text: `**Webhooks (${webhooks.size}):**\n\n${lines.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list webhooks: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'send_webhook_message',
    'Send a message via webhook URL with custom display name and avatar',
    {
      webhookUrl: z.string().describe('Discord Webhook URL'),
      message: z.string().describe('Message text to post'),
      username: z.string().optional().describe('Override username for this message'),
      avatarUrl: z.string().optional().describe('Override avatar URL for this message'),
    },
    async ({ webhookUrl, message, username, avatarUrl }) => {
      try {
        const hook = new WebhookClient({ url: webhookUrl });
        const sent = await hook.send({
          content: message,
          username: username || undefined,
          avatarURL: avatarUrl || undefined,
        });

        hook.destroy();
        return { content: [{ type: 'text', text: `Webhook message sent successfully (Message ID: \`${sent.id}\`).` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to send webhook message: ${formatError(err)}` }] };
      }
    }
  );
}
