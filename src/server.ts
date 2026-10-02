import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';

/**
 * Creates and initializes the Discp MCP Server instance.
 */
export function createDiscpServer(): McpServer {
  const server = new McpServer({
    name: 'discp',
    version: '1.0.0',
  });

  registerAllTools(server);

  return server;
}
