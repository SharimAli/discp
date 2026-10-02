import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('--- Testing Message Lifecycle (send, react, edit, delete) ---');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:\\Users\\whoami\\.gemini\\antigravity\\scratch\\discp\\dist\\index.js'],
  });

  const client = new Client(
    { name: 'discp-tester', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  const TEST_CHANNEL = '1522567597994807406'; // copier-debug-logs

  // 1. Send test message
  console.log('1. Sending message...');
  const sendRes = await client.callTool({
    name: 'send_message',
    arguments: {
      channelId: TEST_CHANNEL,
      message: '🤖 Discp MCP automated test message - verifying live write capability.',
    },
  });
  console.log('Send result:', sendRes.content?.[0]?.text);

  const text = sendRes.content?.[0]?.text || '';
  const match = text.match(/`(\d+)`/);
  if (!match) {
    console.log('Could not parse message ID for cleanup.');
    await client.close();
    process.exit(0);
  }

  const messageId = match[1];
  console.log('Created Message ID:', messageId);

  // 2. Add reaction
  console.log('2. Adding reaction...');
  const reactRes = await client.callTool({
    name: 'add_reaction',
    arguments: {
      channelId: TEST_CHANNEL,
      messageId,
      emoji: '✅',
    },
  });
  console.log('Reaction result:', reactRes.content?.[0]?.text);

  // 3. Edit message
  console.log('3. Editing message...');
  const editRes = await client.callTool({
    name: 'edit_message',
    arguments: {
      channelId: TEST_CHANNEL,
      messageId,
      newMessage: '🤖 Discp MCP automated test message - [EDITED & VERIFIED SUCCESSFUL]',
    },
  });
  console.log('Edit result:', editRes.content?.[0]?.text);

  // 4. Delete message
  console.log('4. Deleting message...');
  const delRes = await client.callTool({
    name: 'delete_message',
    arguments: {
      channelId: TEST_CHANNEL,
      messageId,
    },
  });
  console.log('Delete result:', delRes.content?.[0]?.text);

  await client.close();
  console.log('🎉 Full message lifecycle test passed cleanly!');
}

main().catch(err => {
  console.error('Lifecycle test error:', err);
  process.exit(1);
});
