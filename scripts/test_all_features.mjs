import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('==================================================');
  console.log('🚀 DISCP COMPLETE FEATURE TEST SUITE');
  console.log('==================================================\n');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:\\Users\\whoami\\.gemini\\antigravity\\scratch\\discp\\dist\\index.js'],
  });

  const client = new Client(
    { name: 'discp-tester', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected to Discp MCP server via Stdio transport.');

  // 1. List tools
  const toolList = await client.listTools();
  console.log(`✅ Loaded ${toolList.tools.length} total tools from Discp.\n`);

  const results = [];

  async function testTool(toolName, args, description) {
    process.stdout.write(`🧪 Testing [${toolName}] (${description})... `);
    try {
      const res = await client.callTool({ name: toolName, arguments: args });
      const text = res.content?.[0]?.text || '';
      if (text.startsWith('Failed') || text.includes('Error:')) {
        console.log(`⚠️ SOFT FAIL: ${text.slice(0, 80)}...`);
        results.push({ name: toolName, status: 'WARN', detail: text.slice(0, 80) });
      } else {
        console.log(`✅ SUCCESS (${text.length} chars output)`);
        results.push({ name: toolName, status: 'PASS', preview: text.slice(0, 100).replace(/\n/g, ' ') });
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ name: toolName, status: 'FAIL', error: err.message });
    }
  }

  const TEST_GUILD = '1370373765820579982'; // CUSTOM BOT TESTINGS
  const TEST_CHANNEL = '1522552615484002465'; // signals-updates
  const TEST_USER = '1373950539645190154'; // self account

  // Run suite covering all 18 modules:
  await testTool('get_bot_info', {}, 'Bot Account Info');
  await testTool('list_servers', {}, 'Enumerate Connected Guilds');
  await testTool('get_server_info', { guildId: TEST_GUILD }, 'Server Metrics & Settings');
  await testTool('get_server_vanity_url', { guildId: TEST_GUILD }, 'Server Vanity URL');
  await testTool('get_server_widget', { guildId: TEST_GUILD }, 'Server Widget Settings');
  await testTool('get_prune_count', { guildId: TEST_GUILD, days: 7 }, 'Inactive Member Prune Estimate');
  await testTool('list_channels', { guildId: TEST_GUILD }, 'List Server Channels');
  await testTool('find_channel', { guildId: TEST_GUILD, name: 'signals' }, 'Search Channels by Name');
  await testTool('get_channel_info', { channelId: TEST_CHANNEL }, 'Fetch Detailed Channel Metadata');
  await testTool('list_channel_permissions', { channelId: TEST_CHANNEL }, 'Channel Permissions & Overwrites');
  await testTool('list_roles', { guildId: TEST_GUILD }, 'Enumerate Roles & Permissions');
  await testTool('get_user_info', { userId: TEST_USER }, 'Fetch User Profile Data');
  await testTool('read_messages', { channelId: TEST_CHANNEL, count: 5 }, 'Fetch Channel History');
  await testTool('list_emojis', { guildId: TEST_GUILD }, 'List Custom Emojis');
  await testTool('list_stickers', { guildId: TEST_GUILD }, 'List Guild Stickers');
  await testTool('list_scheduled_events', { guildId: TEST_GUILD }, 'Fetch Scheduled Events');
  await testTool('list_active_threads', { guildId: TEST_GUILD }, 'List Active Threads');
  await testTool('list_forum_channels', { guildId: TEST_GUILD }, 'List Forum Channels');
  await testTool('list_invites', { guildId: TEST_GUILD }, 'List Server Invites');
  await testTool('list_automod_rules', { guildId: TEST_GUILD }, 'List AutoMod Rules');
  await testTool('list_members', { guildId: TEST_GUILD, limit: 10 }, 'List Server Members');
  await testTool('search_members', { guildId: TEST_GUILD, query: 'skill' }, 'Search Members by Prefix');
  await testTool('generate_bot_invite_url', { clientId: TEST_USER }, 'Generate OAuth Invite URL');

  console.log('\n==================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('==================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tested: ${results.length} | Passed: ${passed} | Warnings: ${warnings} | Failed: ${failed}\n`);

  for (const r of results) {
    console.log(`[${r.status}] ${r.name.padEnd(25)} ${r.preview || r.detail || r.error}`);
  }

  await client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
