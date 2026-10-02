import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatError } from '../utils/errors.js';

export const DISCORD_SYMBOLS_LIBRARY = {
  dividers: [
    '✦ ━━━ ❖ ━━━ ✦',
    '────୨ৎ────',
    '────⋆⋅☆⋅⋆────',
    '·⊹°୨୧°⊹·',
    '═══ ⋆★⋆ ═══',
    '╭━━━━━━━━━━━━━╮',
    '╰━━━━━━━━━━━━━╯',
    '⏝ ꦿ ۫ ೄ ⏝',
    '·.̩₊̣.̩✧*̣̩˚̣̣⁺̣‧.₊̣̇.‧⁺̣˚̣̣*̣̩✧·.̩₊̣.̩',
    '━━━━━━ ◦ ❖ ◦ ━━━━━━',
    '─━─━─━─━─━─━─━─━',
    '· · ─────── ·𖥸· ─────── · ·',
    '⋆ ˚｡⋆୨୧˚ ━━━━━━━━━━ ˚୨୧⋆｡˚ ⋆',
  ],
  channel_prefixes: [
    '💬┆', '📜┆', '📢┆', '👋┆', '🤖┆', '📸┆', '🧠┆', '💻┆', '🔒┆', '📋┆', '🔊┆', '🎮┆', '🎨┆', '📌┆',
    '・〢', '◟♯ . / ', '|💬| • ', '⚬✦ ', '〔ㅤㅤㅤㅤㅤㅤㅤ〕', '・₊˚', '┊', '丨', '︱', '｜', '𐙚・', '﹕',
  ],
  role_badges: [
    '👑・', '🛡️・', '⚔️・', '💎・', '🤖・', '🌟・', '👤・', '🔇・', '〔★〕', '「⚡」', '🔮・', '🚀・', '🏆・',
  ],
  sparkles_and_stars: [
    '✦', '✧', '⟡', '⋆', '★', '☆', '✮', '✰', '｡･:*:･ﾟ★', '*ੈ✩‧₊˚', '*ੈ♡‧₊˚', '.𖥔 ݁ ˖', '⋆˚࿔', '𝜗𝜚˚⋆', '₊˚⊹♡',
  ],
  brackets_and_boxes: [
    '「」', '『』', '【】', '〔〕', '〘〙', '《》', '«»', '⟦⟧', '〚〛',
  ],
  arrows_and_pointers: [
    '➔', '➜', '➤', '╰┈➤', '⇢', '⤷', '↳', '►', '▸', '»', '🡢', 'ᯓ★',
  ],
  templates: {
    community: {
      categories: [
        '✦ ━━ INFORMATION ━━ ✦',
        '✦ ━━ COMMUNITY ━━ ✦',
        '✦ ━━ MEDIA & ART ━━ ✦',
        '✦ ━━ VOICE LOUNGES ━━ ✦',
        '✦ ━━ STAFF HEADQUARTERS ━━ ✦',
      ],
      channels: [
        '📜┆rules-and-guidelines', '📢┆announcements', '👋┆welcome-and-faq',
        '💬┆general-chat', '🤖┆bot-commands', '🎉┆events-and-giveaways',
        '📸┆media-and-showcase', '🎨┆art-and-creations',
        '🔊┆Chill Lounge', '🔊┆Gaming Voice',
        '🔒┆staff-chat', '📋┆mod-logs',
      ],
    },
    tech_and_coding: {
      categories: [
        '✦ ━━ ORIENTATION ━━ ✦',
        '✦ ━━ GENERAL DISCUSSIONS ━━ ✦',
        '✦ ━━ AI & AGENTIC TOOLS ━━ ✦',
        '✦ ━━ SYSTEMS & CODE ━━ ✦',
        '✦ ━━ CO-WORKING VOICE ━━ ✦',
      ],
      channels: [
        '📜┆rules', '📢┆announcements', '🔗┆useful-resources',
        '💬┆general-dev', '💡┆project-ideas',
        '🧠┆llm-and-agents', '🛠️┆mcp-tools',
        '💻┆code-review', '🐛┆debugging-help',
        '🔊┆Pair Programming', '🔊┆Pomodoro Study',
      ],
    },
    gaming: {
      categories: [
        '✦ ━━ SERVER INFO ━━ ✦',
        '✦ ━━ GAMING LOBBY ━━ ✦',
        '✦ ━━ CLAN & SQUADS ━━ ✦',
        '✦ ━━ SQUAD COMMS ━━ ✦',
      ],
      channels: [
        '📜┆server-rules', '📢┆patch-notes',
        '💬┆general-chat', '🎮┆looking-for-group', '🏆┆leaderboards',
        '⚔️┆squad-recruitment', '🛡️┆clan-strategy',
        '🔊┆Squad 1', '🔊┆Squad 2', '🔊┆Casual Gaming',
      ],
    },
  },
};

export function registerSymbolTools(server: McpServer): void {
  server.tool(
    'get_discord_symbols',
    'Get curated aesthetic Discord symbols, dividers, channel prefixes, role badges, and server templates for building attractive Discord servers',
    {
      category: z.enum([
        'all',
        'dividers',
        'channel_prefixes',
        'role_badges',
        'sparkles_and_stars',
        'brackets_and_boxes',
        'arrows_and_pointers',
        'templates',
      ]).default('all').describe('Symbol category to retrieve'),
    },
    async ({ category }) => {
      try {
        if (category === 'all') {
          return {
            content: [{
              type: 'text',
              text: [
                '# ✦ Discord Aesthetic Symbols & Component Library ✦\n',
                '### 1. Aesthetic Dividers',
                DISCORD_SYMBOLS_LIBRARY.dividers.map((d) => `- \`${d}\``).join('\n'),
                '\n### 2. Channel Name Prefixes & Dividers',
                DISCORD_SYMBOLS_LIBRARY.channel_prefixes.map((p) => `- \`${p}\``).join('\n'),
                '\n### 3. Role Badges & Icons',
                DISCORD_SYMBOLS_LIBRARY.role_badges.map((r) => `- \`${r}\``).join('\n'),
                '\n### 4. Sparkles & Stars',
                DISCORD_SYMBOLS_LIBRARY.sparkles_and_stars.map((s) => `- \`${s}\``).join('  '),
                '\n### 5. Brackets & Enclosures',
                DISCORD_SYMBOLS_LIBRARY.brackets_and_boxes.map((b) => `- \`${b}\``).join('  '),
                '\n### 6. Arrows & Pointers',
                DISCORD_SYMBOLS_LIBRARY.arrows_and_pointers.map((a) => `- \`${a}\``).join('  '),
                '\n### 7. Server Layout Templates Available',
                '- `community` (Standard Community Hub)',
                '- `tech_and_coding` (Developer, MCP, AI systems)',
                '- `gaming` (Esports, squads, LFG)',
              ].join('\n'),
            }],
          };
        }

        if (category === 'templates') {
          const t = DISCORD_SYMBOLS_LIBRARY.templates;
          return {
            content: [{
              type: 'text',
              text: `### Available Layout Templates:\n\n` +
                Object.entries(t).map(([name, tmpl]) => {
                  return `#### Template: ${name.toUpperCase()}\n**Categories:**\n${tmpl.categories.map((c) => `- ${c}`).join('\n')}\n\n**Channels:**\n${tmpl.channels.map((ch) => `- ${ch}`).join('\n')}`;
                }).join('\n\n---\n\n'),
            }],
          };
        }

        const items = (DISCORD_SYMBOLS_LIBRARY as any)[category] || [];
        return {
          content: [{
            type: 'text',
            text: `### Discord Symbols: ${category.toUpperCase()} (${items.length} items)\n\n` +
              items.map((it: string) => `- \`${it}\``).join('\n'),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to get symbols: ${formatError(err)}` }] };
      }
    }
  );

  server.tool(
    'search_discord_symbols',
    'Search for Discord symbols, aesthetic combos, and dividers locally and dynamically from online aesthetic symbol databases (emojicombos/emojidb)',
    {
      query: z.string().describe('Search keyword (e.g. "star", "divider", "cute", "cyber", "gaming", "line", "aesthetic")'),
      fetchOnline: z.boolean().default(true).describe('Fetch live dynamic symbols from online database (default: true)'),
    },
    async ({ query, fetchOnline }) => {
      try {
        const q = query.trim().toLowerCase();
        const localMatches: string[] = [];

        // Search local curated library
        for (const [cat, list] of Object.entries(DISCORD_SYMBOLS_LIBRARY)) {
          if (cat === 'templates') continue;
          for (const item of list as string[]) {
            if (item.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) {
              localMatches.push(item);
            }
          }
        }

        let onlineResults: string[] = [];
        if (fetchOnline) {
          try {
            const url = `https://emojicombos.com/api/keywordsToEmojis?keywords=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            if (res.ok) {
              const data = await res.json() as string[];
              if (Array.isArray(data)) {
                onlineResults = data.slice(0, 20);
              }
            }
          } catch {}
        }

        const combined = Array.from(new Set([...localMatches, ...onlineResults]));
        if (combined.length === 0) {
          return { content: [{ type: 'text', text: `No symbols found matching "${query}". Try queries like "star", "divider", "line", "flower", "aesthetic".` }] };
        }

        return {
          content: [{
            type: 'text',
            text: `### Discord Symbols & Emojis matching "${query}" (${combined.length} results):\n\n` +
              combined.map((s) => `- \`${s}\`  ${s}`).join('\n'),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to search symbols: ${formatError(err)}` }] };
      }
    }
  );
}
