import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDiscordClient } from '../client.js';
import { resolveTextChannel } from '../utils/discord.js';
import { formatError } from '../utils/errors.js';

export function registerPollTools(server: McpServer): void {
  server.tool(
    'create_poll',
    'Create an official interactive Discord poll in a channel',
    {
      channelId: z.string().describe('Discord channel ID'),
      question: z.string().describe('The poll question (up to 300 characters)'),
      answersCsv: z.string().describe('Comma-separated list of answer options (2 to 10 options)'),
      durationHours: z.number().min(1).max(168).default(24).describe('Poll duration in hours: 1, 4, 8, 24, 72, 168 (default: 24)'),
      allowMultiselect: z.boolean().default(false).describe('Allow users to select multiple answers'),
    },
    async ({ channelId, question, answersCsv, durationHours, allowMultiselect }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);

        const options = answersCsv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (options.length < 2 || options.length > 10) {
          return { content: [{ type: 'text', text: 'Discord polls require between 2 and 10 answer options.' }] };
        }

        const pollData = {
          question: { text: question },
          answers: options.map((opt) => ({ text: opt })),
          duration: durationHours,
          allowMultiselect,
        };

        const msg = await channel.send({
          poll: pollData as any,
        });

        return {
          content: [{
            type: 'text',
            text: `Poll successfully posted! Link: ${msg.url}\nQuestion: "${question}" with ${options.length} options.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to create poll: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'end_poll',
    'Immediately end and close an active poll so no further votes can be cast',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Poll message ID'),
    },
    async ({ channelId, messageId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        if (!msg.poll) {
          return { content: [{ type: 'text', text: `Message \`${messageId}\` does not contain a poll.` }] };
        }

        await msg.poll.end();
        return { content: [{ type: 'text', text: `Poll on message \`${messageId}\` successfully ended.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to end poll: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'get_poll_answer_voters',
    'Fetch users who voted for a specific answer in a poll',
    {
      channelId: z.string().describe('Discord channel ID'),
      messageId: z.string().describe('Poll message ID'),
      answerId: z.number().describe('Numeric answer option ID (typically 1, 2, 3...)'),
    },
    async ({ channelId, messageId, answerId }) => {
      try {
        const client = await getDiscordClient();
        const channel = await resolveTextChannel(client, channelId);
        const msg = await channel.messages.fetch(messageId);

        if (!msg.poll) {
          return { content: [{ type: 'text', text: `Message \`${messageId}\` does not contain a poll.` }] };
        }

        const answer = msg.poll.answers.get(answerId);
        if (!answer) {
          return { content: [{ type: 'text', text: `Answer option ID ${answerId} not found in this poll.` }] };
        }

        let voters: Array<{ id: string; tag: string }> = [];
        try {
          if (client.api && client.api.channels) {
            const res = await client.api.channels(channelId).polls(messageId).answers(answerId).get();
            if (res && Array.isArray(res.users)) {
              voters = res.users.map((u: any) => ({
                id: u.id,
                tag: u.discriminator && u.discriminator !== '0' ? `${u.username}#${u.discriminator}` : u.username,
              }));
            }
          } else if (typeof (answer as any).fetchVoters === 'function') {
            const coll = await (answer as any).fetchVoters();
            voters = Array.from(coll.values()).map((u: any) => ({ id: u.id, tag: u.tag || u.username }));
          }
        } catch {
          if (typeof (answer as any).fetchVoters === 'function') {
            const coll = await (answer as any).fetchVoters();
            voters = Array.from(coll.values()).map((u: any) => ({ id: u.id, tag: u.tag || u.username }));
          }
        }

        if (voters.length === 0) {
          return { content: [{ type: 'text', text: `No votes yet for "${answer.text}".` }] };
        }

        const voterNames = voters.map((u) => `- ${u.tag} (\`${u.id}\`)`).join('\n');
        return {
          content: [{
            type: 'text',
            text: `**Voters for "${answer.text}" (${voters.length} total):**\n${voterNames}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get poll voters: ${formatError(err)}` }] };
      }
    }
  );
}
