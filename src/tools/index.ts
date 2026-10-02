import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGuildTools } from './guilds.js';
import { registerChannelTools } from './channels.js';
import { registerPermissionTools } from './permissions.js';
import { registerMessageTools } from './messages.js';
import { registerUserTools } from './users.js';
import { registerModerationTools } from './moderation.js';
import { registerRoleTools } from './roles.js';
import { registerAutoModTools } from './automod.js';
import { registerPollTools } from './polls.js';
import { registerThreadTools } from './threads.js';
import { registerForumTools } from './forums.js';
import { registerVoiceTools } from './voice.js';
import { registerEventTools } from './events.js';
import { registerInviteTools } from './invites.js';
import { registerBotTools } from './bot.js';
import { registerWebhookTools } from './webhooks.js';
import { registerEmojiTools } from './emojis.js';
import { registerStickerTools } from './stickers.js';
import { registerSymbolTools } from './symbols.js';
import { registerFormattingTools } from './formatting.js';

/**
 * Registers all domain-specific Discp MCP tools with the McpServer instance.
 */
export function registerAllTools(server: McpServer): void {
  registerGuildTools(server);
  registerChannelTools(server);
  registerPermissionTools(server);
  registerMessageTools(server);
  registerUserTools(server);
  registerModerationTools(server);
  registerRoleTools(server);
  registerAutoModTools(server);
  registerPollTools(server);
  registerThreadTools(server);
  registerForumTools(server);
  registerVoiceTools(server);
  registerEventTools(server);
  registerInviteTools(server);
  registerBotTools(server);
  registerWebhookTools(server);
  registerEmojiTools(server);
  registerStickerTools(server);
  registerSymbolTools(server);
  registerFormattingTools(server);
}
