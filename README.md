<div align="center">
  <h1>⚡ Discp</h1>
  <p><strong>The Feature-Complete Discord Model Context Protocol (MCP) Server</strong></p>
  <p>Providing any AI assistant (Claude Desktop, Claude Code, Cursor, Antigravity, OpenCode, Windsurf, n8n) with native, granular control over Discord.</p>
</div>

---

## 📖 Overview

**Discp** is a production-grade Discord MCP server written in TypeScript. It bridges AI assistants to Discord with **117 native tools**, supporting both **User/Alt Accounts** and **Bot Accounts** seamlessly without requiring bot verification or developer portal setup.

### 🛡️ Anti-Abuse Human Pacing (Zero Warning Flags)
To prevent accounts from triggering Discord security checkpoints, rate-limits, or password resets, Discp enforces **natural human pacing** (1.2s – 2.5s randomized intervals) across sensitive write operations (creating channels, roles, categories, webhooks, and assigning permissions).

### 🎨 Creative Variation (No Repetitive Designs)
Discp equips AI models with tools to discover fresh aesthetic symbols and channel architectures dynamically:
* `get_discord_symbols`: Curated offline library of dividers, channel prefixes, role badges, sparkles, and layout templates.
* `search_discord_symbols`: Searches online databases (**emojicombos**, **emojidb**) live on demand so every server gets unique aesthetics.
* `get_discord_syntax_guide`: Complete cheatsheet of Discord markdown techniques, timestamps, mentions, and internal navigation links.

---

## 🛠️ Complete Tool Catalog (117 Tools)

| Domain | Count | Highlight Tools |
| :--- | :---: | :--- |
| **Server Operations** | 11 | `list_servers`, `get_server_info`, `modify_server_settings`, `create_server`, `setup_community_server`, `get_audit_logs`, `modify_server_widget`, `prune_members` |
| **Channels & Categories** | 14 | `create_text_channel`, `create_voice_channel`, `create_stage_channel`, `create_category`, `edit_channel`, `edit_category`, `delete_channel`, `delete_category`, `list_channels`, `list_channels_in_category`, `find_channel`, `get_channel_info`, `move_channel` |
| **Permissions** | 4 | `list_channel_permissions`, `upsert_role_channel_permissions`, `upsert_member_channel_permissions`, `delete_channel_permission` |
| **Messages & Reactions** | 12 | `send_message`, `edit_message`, `delete_message`, `read_messages`, `bulk_delete_messages`, `pin_message`, `unpin_message`, `list_pinned_messages`, `add_reaction`, `remove_reaction`, `clear_reactions`, `get_message_attachments` |
| **Formatting & Mentions** | 3 | `format_discord_mention`, `resolve_discord_mentions`, `get_discord_syntax_guide` |
| **Symbols & Aesthetics** | 2 | `get_discord_symbols`, `search_discord_symbols` |
| **Users & Direct Messages** | 6 | `get_user_info`, `get_user_id_by_name`, `send_direct_message`, `edit_direct_message`, `delete_direct_message`, `read_direct_messages` |
| **Members & Moderation** | 11 | `kick_member`, `ban_member`, `unban_member`, `timeout_member`, `remove_timeout`, `set_member_nickname`, `list_bans`, `get_ban_info`, `list_members`, `search_members`, `get_member_info` |
| **Roles** | 7 | `list_roles`, `get_role_info`, `create_role`, `edit_role`, `delete_role`, `assign_role`, `remove_role` |
| **AutoModeration** | 5 | `list_automod_rules`, `get_automod_rule`, `create_automod_rule`, `edit_automod_rule`, `delete_automod_rule` |
| **Interactive Polls** | 3 | `create_poll`, `end_poll`, `get_poll_answer_voters` |
| **Threads** | 6 | `create_thread`, `modify_thread`, `join_thread`, `leave_thread`, `list_active_threads` |
| **Forums** | 7 | `create_forum_channel`, `edit_forum_channel`, `list_forum_channels`, `get_forum_channel_info`, `list_forum_tags`, `create_forum_post`, `list_forum_posts` |
| **Voice Channels** | 4 | `move_voice_member`, `disconnect_voice_member`, `modify_voice_state` |
| **Scheduled Events** | 5 | `create_scheduled_event`, `edit_scheduled_event`, `delete_scheduled_event`, `list_scheduled_events`, `get_scheduled_event_users` |
| **Invites** | 4 | `create_invite`, `list_invites`, `delete_invite`, `get_invite_details` |
| **Webhooks** | 4 | `create_webhook`, `delete_webhook`, `list_webhooks`, `send_webhook_message` |
| **Emojis & Stickers** | 8 | `list_emojis`, `get_emoji_details`, `create_emoji`, `edit_emoji`, `delete_emoji`, `list_stickers`, `create_sticker`, `delete_sticker` |
| **Bot Utilities** | 2 | `get_bot_info`, `generate_bot_invite_url` |

---

## ⚡ Quickstart

### 1. Clone & Build
```bash
git clone https://github.com/SharimAli/discp.git
cd discp
npm install
npm run build
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```env
# 'user' (for user/alt account token) or 'bot' (for Discord bot token)
DISCORD_ACCOUNT_TYPE=user

# Your Token
DISCORD_TOKEN=your_token_here

# Default Server ID (Optional: commands will default to this guild)
DISCORD_GUILD_ID=your_default_server_id_here
```

---

## 🔌 Client Integration Guides

### 1. Cursor IDE
In `~/.cursor/mcp.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["/path/to/discp/dist/index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_DISCORD_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_SERVER_ID"
      }
    }
  }
}
```

### 2. Claude (Desktop & Code CLI)
* **Claude Desktop:** Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["/path/to/discp/dist/index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_DISCORD_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_SERVER_ID"
      }
    }
  }
}
```
* **Claude Code CLI:**
```bash
claude mcp add discp node /path/to/discp/dist/index.js \
  --env DISCORD_ACCOUNT_TYPE=user \
  --env DISCORD_TOKEN="YOUR_DISCORD_TOKEN" \
  --env DISCORD_GUILD_ID="YOUR_SERVER_ID"
```

### 3. Google Antigravity IDE
In `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["C:\\path\\to\\discp\\dist\\index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_DISCORD_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_SERVER_ID"
      }
    }
  }
}
```

### 4. OpenCode Desktop / OpenClaw
In `opencode.json`:
```json
{
  "mcp": {
    "servers": {
      "discp": {
        "command": "node",
        "args": ["/path/to/discp/dist/index.js"],
        "env": {
          "DISCORD_ACCOUNT_TYPE": "user",
          "DISCORD_TOKEN": "YOUR_DISCORD_TOKEN",
          "DISCORD_GUILD_ID": "YOUR_SERVER_ID"
        }
      }
    }
  }
}
```

### 5. Other Editors (VS Code / Cline / Roo Code / Continue / Windsurf)
Use the standard MCP server definition in your tool's settings (`cline_mcp_settings.json`, `~/.codeium/windsurf/mcp_config.json`, or `.continue/config.json`):
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["/path/to/discp/dist/index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_DISCORD_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_SERVER_ID"
      }
    }
  }
}
```

### 6. HTTP / SSE Mode (n8n, Flowise, Remote AI)
Run Discp as a persistent network microservice:
```bash
export MCP_TRANSPORT=http
export PORT=8085
node dist/index.js
```
* **SSE Stream:** `http://localhost:8085/sse`
* **Messages:** `http://localhost:8085/messages`
* **Health Check:** `http://localhost:8085/health`

---

## 💡 Discord Mention & Formatting Syntax

| Component | Syntax | Rendered Result |
| :--- | :--- | :--- |
| **Channel Pill** | `<#1555613673920270347>` | Clickable `#welcome-and-faq` link |
| **Role Pill** | `<@&1555613563899347044>` | Colored `@Moderator` badge |
| **User Pill** | `<@1188806930802675745>` | Clickable `@coded2233` profile |
| **Dynamic Time** | `<t:1727888400:R>` | Relative countdown (`in 2 days`, `3 hours ago`) |
| **Server Tab** | `<id:browse>` / `<id:guide>` | Direct link to Server Channels or Onboarding |
| **Subtext** | `-# Small muted note` | Reduced-size secondary text |
| **Spoiler** | `\|\|hidden text\|\|` | Click-to-reveal black bar |

*Tip: Enable `resolveMentions: true` in `send_message` or `edit_message` to automatically convert `#general` and `@Moderator` into native Discord clickable pills!*

---

## 🎨 Recommended Aesthetic & Template Resources

When designing servers, AI assistants are encouraged to consult:
* **[EmojiCombos Discord Symbols](https://emojicombos.com/discord-channel-name-symbols)** — Channel prefixes & dividers
* **[EmojiDB Channel Symbols](https://emojidb.org/discord-channel-name-symbols-emojis)** — Unicode symbol collections
* **[DiscordGate Symbols](https://discordgate.com/tools/symbols)** — Aesthetic text styles
* **[Scoplidrop Symbols](https://www.scoplidrop.com/tools/discord-symbols)** — Decorative dividers & borders
* **[Xenon Templates](https://xenon.bot/templates/tag/community)** — Community server architecture layouts

---

## 📜 License
MIT License.
