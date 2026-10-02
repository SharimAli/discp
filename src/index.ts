import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { config, validateConfig } from './config.js';
import { createDiscpServer } from './server.js';
import { getDiscordClient } from './client.js';

async function main(): Promise<void> {
  validateConfig();

  // Initialize Discord client in background if token is provided
  if (config.discordToken) {
    getDiscordClient().catch((err) => {
      console.error('[Discp] Failed to connect to Discord Gateway:', err.message);
    });
  }

  const mcpServer = createDiscpServer();

  if (config.transport === 'http') {
    const app = express();
    const transports = new Map<string, SSEServerTransport>();

    // Health check endpoint (for container / orchestration health monitoring)
    app.get('/health', async (_req, res) => {
      try {
        const client = await getDiscordClient().catch(() => null);
        res.json({
          status: 'UP',
          discordConnected: client?.isReady() ?? false,
          uptime: process.uptime(),
          version: '1.0.0',
        });
      } catch {
        res.status(503).json({ status: 'DOWN' });
      }
    });

    // SSE Stream endpoint for MCP clients
    app.get('/sse', async (_req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports.set(transport.sessionId, transport);

      res.on('close', () => {
        transports.delete(transport.sessionId);
      });

      await mcpServer.connect(transport);
    });

    // Message reception endpoint for SSE transport
    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);

      if (!transport) {
        res.status(404).json({ error: `Session ${sessionId} not found.` });
        return;
      }

      await transport.handlePostMessage(req, res);
    });

    app.listen(config.port, () => {
      console.error(`[Discp] HTTP Streamable MCP Server listening at http://localhost:${config.port}`);
      console.error(`[Discp] SSE Endpoint: http://localhost:${config.port}/sse`);
      console.error(`[Discp] Health Check: http://localhost:${config.port}/health`);
    });
  } else {
    // Standard I/O transport (Default for Claude Desktop, Cursor, Antigravity)
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('[Discp] Discp MCP Server running on STDIO transport.');
  }
}

main().catch((err) => {
  console.error('[Discp] Fatal startup error:', err);
  process.exit(1);
});
