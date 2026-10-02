import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('[TestClient] Starting MCP client test...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:\\Users\\whoami\\.gemini\\antigravity\\scratch\\discp\\dist\\index.js'],
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('[TestClient] Connected to Discp MCP server via Stdio!');

  // 1. List tools
  const tools = await client.listTools();
  console.log(`[TestClient] Discp loaded ${tools.tools.length} MCP tools successfully!`);

  // 2. Call get_bot_info
  console.log('[TestClient] Calling get_bot_info...');
  const botInfo = await client.callTool({
    name: 'get_bot_info',
    arguments: {},
  });
  console.log('[TestClient] Bot Info Result:', JSON.stringify(botInfo, null, 2));

  // 3. Call list_servers
  console.log('[TestClient] Calling list_servers...');
  const servers = await client.callTool({
    name: 'list_servers',
    arguments: {},
  });
  console.log('[TestClient] Server List Result:', JSON.stringify(servers, null, 2));

  // 3. Close
  await client.close();
  console.log('[TestClient] Test completed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('[TestClient] Error:', err);
  process.exit(1);
});
