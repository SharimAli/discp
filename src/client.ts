import { Client as SelfbotClient } from 'discord.js-selfbot-v13';
import { Client as BotClient, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';

let discordClient: any = null;
let clientReadyPromise: Promise<any> | null = null;
let currentToken: string = '';

let lastActionTime = 0;

/**
 * Human pacing helper to prevent Discord anti-abuse security warnings / password resets.
 * Ensures natural pauses between Discord API calls.
 */
export async function humanPace(minDelayMs = 1200, maxDelayMs = 2200): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastActionTime;
  const targetDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  if (elapsed < targetDelay) {
    await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
  }
  lastActionTime = Date.now();
}

/**
 * Initializes and logs in the Discord Client.
 * Automatically invalidates and reconnects if DISCORD_TOKEN is updated.
 */
export async function getDiscordClient(): Promise<any> {
  const activeToken = config.discordToken;
  if (!activeToken) {
    throw new Error(
      'DISCORD_TOKEN is not configured. Please paste your user account token in ~/.gemini/config/mcp_config.json under "discp" env, or in .env.'
    );
  }

  // If token changed, cleanly destroy old client and re-authenticate
  if (discordClient && currentToken && currentToken !== activeToken) {
    console.error('[Discp] Detected updated DISCORD_TOKEN. Re-authenticating client...');
    try {
      if (typeof discordClient.destroy === 'function') {
        discordClient.destroy();
      }
    } catch {}
    discordClient = null;
    clientReadyPromise = null;
  }

  if (discordClient && discordClient.isReady && discordClient.isReady()) {
    return discordClient;
  }

  if (clientReadyPromise) {
    return clientReadyPromise;
  }

  currentToken = activeToken;

  if (config.accountType === 'user') {
    discordClient = new (SelfbotClient as any)({
      checkUpdate: false,
    });
  } else {
    discordClient = new BotClient({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
      ],
    });
  }

  clientReadyPromise = new Promise((resolve, reject) => {
    discordClient.once('ready', (readyClient: any) => {
      console.error(
        `[Discp] Connected to Discord as ${readyClient.user.tag} (ID: ${readyClient.user.id}) [Mode: ${config.accountType.toUpperCase()}]`
      );
      resolve(readyClient);
    });

    discordClient.once('error', (err: any) => {
      console.error('[Discp] Discord client error:', err);
      reject(err);
    });

    discordClient.login(config.discordToken).catch((err: any) => {
      console.error('[Discp] Login failed. Verify your DISCORD_TOKEN.');
      reject(err);
    });
  });

  return clientReadyPromise;
}
