import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { registerAllTools } from '../dist/tools/index.js';

const targetDir = 'C:\\Users\\whoami\\.gemini\\antigravity\\mcp\\discp';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const server = new McpServer({ name: 'discp', version: '1.0.0' });
registerAllTools(server);

const tools = server._registeredTools;
let count = 0;

for (const [name, toolObj] of Object.entries(tools)) {
  let schema;
  if (!toolObj.inputSchema || !toolObj.inputSchema._def) {
    schema = {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#',
    };
  } else {
    schema = zodToJsonSchema(toolObj.inputSchema);
  }

  const toolDefinition = {
    name,
    description: toolObj.description,
    parameters: schema,
  };

  const filePath = path.join(targetDir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(toolDefinition));
  count++;
}

console.log(`Successfully generated ${count} tool schemas in ${targetDir}`);
