import { DiscordAPIError } from 'discord.js';

/**
 * Normalizes Discord API errors and standard runtime exceptions into clear,
 * actionable error messages suitable for LLM consumption.
 */
export function formatError(error: unknown): string {
  if (error instanceof DiscordAPIError) {
    const code = error.code;
    const status = error.status;
    const message = error.message;

    switch (code) {
      case 50013:
        return `Permission Denied (HTTP ${status}): The bot lacks required Discord permissions for this action. Check bot role permissions and channel overwrites.`;
      case 50001:
        return `Missing Access (HTTP ${status}): The bot cannot view or access this resource (channel or guild). Ensure the bot is a member and has VIEW_CHANNEL.`;
      case 10003:
        return `Not Found (HTTP ${status}): Unknown channel ID. Verify the channel exists and the bot can see it.`;
      case 10008:
        return `Not Found (HTTP ${status}): Unknown message ID. The message may have been deleted or is outside accessible history.`;
      case 10007:
        return `Not Found (HTTP ${status}): Unknown member ID. The specified user is not in this server.`;
      case 10011:
        return `Not Found (HTTP ${status}): Unknown role ID.`;
      case 10014:
        return `Not Found (HTTP ${status}): Unknown emoji ID.`;
      case 50035:
        return `Invalid Form Body: ${message}`;
      default:
        return `Discord API Error [Code ${code}, Status ${status}]: ${message}`;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Hierarchy')) {
      return `Hierarchy Conflict: Cannot modify target member or role because it is positioned higher than or equal to the bot's highest role.`;
    }
    return error.message;
  }

  return String(error);
}
