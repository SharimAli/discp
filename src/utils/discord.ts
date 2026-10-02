import {
  Client,
  Guild,
  GuildMember,
  Channel,
  TextBasedChannel,
  PermissionsBitField,
  PermissionResolvable,
} from 'discord.js';
import { config } from '../config.js';

/**
 * Resolves a Guild from guildId parameter or the default configured guild.
 */
export async function resolveGuild(client: Client, guildId?: string): Promise<Guild> {
  let targetId = guildId || config.defaultGuildId;
  if (!targetId && client.guilds.cache.size === 1) {
    targetId = client.guilds.cache.first()?.id;
  }
  if (!targetId) {
    throw new Error('Guild ID not specified and no default DISCORD_GUILD_ID is configured.');
  }

  const cached = client.guilds.cache.get(targetId);
  if (cached) return cached;

  try {
    return await client.guilds.fetch(targetId);
  } catch {
    throw new Error(`Discord server not found for guild ID: ${targetId}`);
  }
}

export type SendableTextChannel = TextBasedChannel & {
  send: (options: any) => Promise<any>;
  messages: any;
};

/**
 * Resolves a TextBasedChannel (TextChannel, NewsChannel, ThreadChannel, VoiceChannel, etc.)
 */
export async function resolveTextChannel(client: Client, channelId: string): Promise<SendableTextChannel> {
  if (!channelId) throw new Error('channelId cannot be empty');

  const channel: any = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => null);
  if (!channel) throw new Error(`Channel not found for channelId: ${channelId}`);
  
  const isText = typeof channel.isTextBased === 'function'
    ? channel.isTextBased()
    : typeof channel.isText === 'function'
    ? channel.isText()
    : ('send' in channel);

  if (!isText || typeof channel.send !== 'function') {
    throw new Error(`Channel ${channelId} does not support text operations`);
  }

  return channel as SendableTextChannel;
}

/**
 * Resolves a GuildMember by user ID within a specified Guild.
 */
export async function resolveMember(guild: Guild, userId: string): Promise<GuildMember> {
  if (!userId) throw new Error('userId cannot be empty');

  const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
  if (!member) throw new Error(`User ID ${userId} is not a member of ${guild.name}`);

  return member;
}

/**
 * Parses either raw bitfield string or CSV permission names into a PermissionsBitField instance.
 * Supports case-insensitive names, with/without underscores, matching Discord.js flags.
 */
export function parsePermissionsInput(rawBitfield?: string, namesCsv?: string): PermissionsBitField {
  if (rawBitfield && namesCsv) {
    throw new Error('Provide either raw bitfield OR permission names, not both.');
  }

  if (rawBitfield) {
    try {
      return new PermissionsBitField(BigInt(rawBitfield));
    } catch {
      throw new Error(`Invalid numeric permissions bitfield: ${rawBitfield}`);
    }
  }

  if (namesCsv) {
    const rawNames = namesCsv.split(',').map((s) => s.trim().replace(/[\s_-]+/g, '').toLowerCase()).filter(Boolean);
    const bitfield = new PermissionsBitField();
    const flagsEntries = Object.entries(PermissionsBitField.Flags);

    for (const raw of rawNames) {
      const match = flagsEntries.find(
        ([key]) => key.replace(/[\s_-]+/g, '').toLowerCase() === raw
      );
      if (match) {
        bitfield.add(match[1]);
      }
    }
    return bitfield;
  }

  return new PermissionsBitField();
}

/**
 * Humanizer delay helper to prevent Discord anti-abuse security warnings.
 */
export async function humanPace(minMs = 1200, maxMs = 2200): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Formats permissions cleanly across both v13 selfbot Permissions and v14 PermissionsBitField.
 */
export function formatPermissions(bitfield: any): string {
  if (!bitfield) return 'None';
  try {
    if (typeof bitfield.toArray === 'function') {
      const arr = bitfield.toArray();
      return arr.length > 0 ? arr.join(', ') : 'None';
    }
    const rawVal = typeof bitfield === 'object' && 'bitfield' in bitfield ? bitfield.bitfield : bitfield;
    const flags = new PermissionsBitField(rawVal).toArray();
    return flags.length > 0 ? flags.join(', ') : 'None';
  } catch {
    return 'Default';
  }
}

/**
 * Human-readable byte size formatter.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Universal guild channel creation helper supporting both v13 and v14 signatures.
 */
export async function createGuildChannel(guild: any, options: {
  name: string;
  type?: any;
  parent?: string;
  topic?: string;
  nsfw?: boolean;
  rateLimitPerUser?: number;
  position?: number;
  userLimit?: number;
  bitrate?: number;
  reason?: string;
}): Promise<any> {
  const { name, type, parent, topic, nsfw, rateLimitPerUser, position, userLimit, bitrate, reason } = options;

  // Try v13 signature first: guild.channels.create(name, options)
  try {
    return await guild.channels.create(name, {
      type,
      parent: parent || undefined,
      topic: topic || undefined,
      nsfw: nsfw || undefined,
      rateLimitPerUser: rateLimitPerUser !== undefined ? rateLimitPerUser : undefined,
      position: position !== undefined ? position : undefined,
      userLimit: userLimit !== undefined ? userLimit : undefined,
      bitrate: bitrate !== undefined ? bitrate : undefined,
      reason,
    });
  } catch {
    // Fallback to v14 signature: guild.channels.create({ name, type, ... })
    return await guild.channels.create({
      name,
      type,
      parent: parent || undefined,
      topic: topic || undefined,
      nsfw: nsfw || undefined,
      rateLimitPerUser: rateLimitPerUser !== undefined ? rateLimitPerUser : undefined,
      position: position !== undefined ? position : undefined,
      userLimit: userLimit !== undefined ? userLimit : undefined,
      bitrate: bitrate !== undefined ? bitrate : undefined,
      reason,
    });
  }
}

