<div align="center">
  <h1>⚡ Discp</h1>
  <p><strong>The Ultimate, Feature-Complete Discord Model Context Protocol (MCP) Server</strong></p>
  <p>Enabling any AI assistant (Claude, Cursor, Antigravity, ChatGPT, OpenClaw, n8n) with native, granular control over Discord.</p>
</div>

---

## 📖 Overview

**Discp** is a high-performance, production-grade MCP server built with **TypeScript**, **`discord.js`**, **`discord.js-selfbot-v13`**, and the official **`@modelcontextprotocol/sdk`**.

It exposes **116 tools** across every Discord subsystem, supporting both **Bot Accounts** and **User/Alt Accounts** without requiring the Discord Developer Portal or complex bot verification.

### 🛡️ Built-in Anti-Abuse Protection & Human Pacing
To prevent user accounts from encountering Discord's automated security warnings, rate-limit locks, or password resets, Discp enforces **natural human pacing** (1.2s – 2.5s randomized intervals) across sensitive write actions (creating roles, channels, categories, webhooks, and assigning permissions).

---

## ✨ Key Capabilities

* **116 Production Tools:** 100% Discord REST and Gateway coverage.
* **Dual Account Mode:**
  * **User Mode (`accountType: "user"`):** Automates directly via a user/alt token with zero bot invitations or developer portal setup.
  * **Bot Mode (`accountType: "bot"`):** Operates as a standard verified Discord bot via Bot Token with full Gateway intent support.
* **Automatic Mention Resolution:**
  * `resolve_discord_mentions` and `resolveMentions: true` automatically translate `#general-chat` and `@Moderator` into clickable native Discord pills (`<#1555613686457040916>`, `<@&1555613563899347044>`).
* **Aesthetic Symbols & Live Search:**
  * `get_discord_symbols` returns curated dividers, channel prefixes, role badges, and Xenon-style server architectures.
  * `search_discord_symbols` queries both local curated symbols and live online aesthetic databases (emojicombos / emojidb).
* **Dual Transport Support:**
  * **STDIO:** Default, zero-latency transport for Claude Desktop, Cursor, and Antigravity.
  * **HTTP / SSE:** Long-running microservice on port `8085` with Server-Sent Events (SSE) and health check monitoring.
* **Resilient Error Translation:** Cryptic Discord API error codes (50013 Missing Permissions, 10008 Unknown Message, hierarchy conflicts) are translated into actionable guidance.

---

## 🛠️ Tool Catalog (116 Tools)

### 1. Server & Guild Operations (11 Tools)
* `list_servers`: List all servers the account is in with member counts and ownership status.
* `get_server_info`: Detailed server statistics, channel counts, boost tier, owner, and features.
* `modify_server_settings`: Modify name, description, AFK voice channel/timeout, system channel, rules channel, and verification level.
* `create_server`: Create a new Discord guild programmatically.
* `setup_community_server`: Deploy a complete, aesthetic community server with categories, channels, hoisted roles, and permissions in one automated, human-paced workflow.
* `get_audit_logs`: Query server audit log history with user and limit filters.
* `get_server_vanity_url`: Retrieve server vanity code and usage stats.
* `get_server_widget`: Query widget status and embed endpoint.
* `modify_server_widget`: Enable/disable widget and assign widget invite channel.
* `get_prune_count`: Estimate inactive members eligible for pruning.
* `prune_members`: Prune inactive members without roles.

### 2. Channels & Categories (14 Tools)
* `create_text_channel`: Create text channel with topic, NSFW, and slowmode.
* `create_voice_channel`: Create voice channel with custom bitrate and user limits.
* `create_stage_channel`: Create stage channel for audio events.
* `create_category`: Create channel organizational category.
* `edit_channel`: Update name, topic, slowmode, NSFW, position, category, or bitrate.
* `edit_category`: Rename category or adjust position.
* `delete_channel`: Delete a channel with audit log reason.
* `delete_category`: Delete category (unparents child channels).
* `list_channels`: List all channels in server with types and IDs.
* `list_channels_in_category`: List channels nested under a specific category.
* `find_channel`: Search channels by exact or partial name.
* `get_channel_info`: Inspect detailed channel metadata.
* `move_channel`: Relocate channel to another category or position.

### 3. Channel Permissions (4 Tools)
* `list_channel_permissions`: View all role and member permission overwrites on a channel.
* `upsert_role_channel_permissions`: Grant or deny channel permissions for a role (e.g. read-only rules).
* `upsert_member_channel_permissions`: Grant or deny channel permissions for an individual member.
* `delete_channel_permission`: Remove permission override for a role or member.

### 4. Messages & Reactions (12 Tools)
* `send_message`: Send messages with optional reply threading and `resolveMentions: true`.
* `edit_message`: Edit previously sent messages with optional `resolveMentions: true`.
* `delete_message`: Delete messages by ID.
* `read_messages`: Fetch channel history with `before`, `after`, and `around` pagination.
* `bulk_delete_messages`: Purge 2-100 messages in one call.
* `pin_message`: Pin message to channel header.
* `unpin_message`: Unpin message from channel.
* `list_pinned_messages`: Retrieve all pinned messages in a channel.
* `add_reaction`: Add unicode or custom emoji reaction.
* `remove_reaction`: Remove reaction from message.
* `clear_reactions`: Remove all reactions from message.
* `get_message_attachments`: Inspect file attachment metadata (names, sizes, MIME types, URLs).

### 5. Formatting & Discord Mentions (2 Tools)
* `format_discord_mention`: Generate proper Discord Markdown mentions and shortcuts (`<@id>`, `<@&id>`, `<#id>`, `<t:time:R>`, `<:emoji:id>`, `</cmd:id>`, `<id:browse>`).
* `resolve_discord_mentions`: Automatically resolves plain text mentions (`#general`, `@Moderator`) against the server's channel and role list.

### 6. Symbols & Aesthetic Generators (2 Tools)
* `get_discord_symbols`: Retrieve categorized aesthetic dividers, channel prefixes, role badges, sparkles, and server templates.
* `search_discord_symbols`: Search symbols locally or dynamically fetch live symbols from online aesthetic databases.

### 7. Direct Messages & Users (6 Tools)
* `get_user_info`: Fetch user account details, avatar, and bot status.
* `get_user_id_by_name`: Resolve username or nickname to User ID for mentions.
* `send_direct_message`: Open private DM channel and send message.
* `edit_direct_message`: Edit sent direct message.
* `delete_direct_message`: Delete sent direct message.
* `read_direct_messages`: Fetch DM history with user.

### 8. Members & Moderation (11 Tools)
* `kick_member`: Kick member from server.
* `ban_member`: Ban user with message purge window (0-7 days).
* `unban_member`: Revoke ban.
* `timeout_member`: Timeout (mute) member for up to 28 days.
* `remove_timeout`: Lift active timeout.
* `set_member_nickname`: Set or reset nickname.
* `list_bans`: List banned accounts with reasons.
* `get_ban_info`: Inspect individual ban entry.
* `list_members`: List server members with roles.
* `search_members`: Search members by name prefix.
* `get_member_info`: Detailed member inspection (roles, voice state, timeout, join date).

### 9. Roles (7 Tools)
* `list_roles`: List all roles sorted by hierarchy position.
* `get_role_info`: Inspect role color, position, hoisted state, and permissions.
* `create_role`: Create role with color, hoist, mentionable, and permission bitfields.
* `edit_role`: Update role name, color, position, or permissions.
* `delete_role`: Delete role with audit log reason.
* `assign_role`: Assign role to server member.
* `remove_role`: Remove role from member.

### 10. AutoModeration (5 Tools)
* `list_automod_rules`: List all active AutoMod rules.
* `get_automod_rule`: Inspect rule trigger, filter keywords, regex, and actions.
* `create_automod_rule`: Create keyword, spam, or mention-spam filters with automated timeouts or alerts.
* `edit_automod_rule`: Update existing AutoMod rule.
* `delete_automod_rule`: Delete AutoMod rule.

### 11. Interactive Polls (3 Tools)
* `create_poll`: Create native interactive Discord polls with 2-10 options, multi-select, and custom duration.
* `end_poll`: Immediately close voting and tally poll results.
* `get_poll_answer_voters`: Fetch list of users who voted for a specific answer option.

### 12. Threads (6 Tools)
* `create_thread`: Start discussion thread in channel or from existing message.
* `modify_thread`: Update name, archived state, locked state, or auto-archive duration.
* `join_thread`: Join thread.
* `leave_thread`: Leave thread.
* `list_active_threads`: List all open threads in server.

### 13. Forums (7 Tools)
* `create_forum_channel`: Create forum channel with guideline tags.
* `edit_forum_channel`: Update forum guidelines and tags.
* `list_forum_channels`: List all forums.
* `get_forum_channel_info`: Get forum metadata.
* `list_forum_tags`: List available tags.
* `create_forum_post`: Create discussion thread post in forum.
* `list_forum_posts`: Fetch active posts in forum.

### 14. Voice Operations (4 Tools)
* `move_voice_member`: Move user between voice channels.
* `disconnect_voice_member`: Disconnect user from voice channel.
* `modify_voice_state`: Server-mute, server-deafen, or suppress voice states.

### 15. Scheduled Events (5 Tools)
* `create_scheduled_event`: Schedule Stage, Voice, or External events with start/end timestamps.
* `edit_scheduled_event`: Update event details.
* `delete_scheduled_event`: Cancel event.
* `list_scheduled_events`: List upcoming server events.
* `get_scheduled_event_users`: Inspect interested attendees.

### 16. Invites (4 Tools)
* `create_invite`: Create invite links with custom max age, uses, and temporary membership.
* `list_invites`: List active server invite links.
* `delete_invite`: Revoke invite code.
* `get_invite_details`: Fetch invite destination, inviter, and member counts.

### 17. Webhooks (4 Tools)
* `create_webhook`: Create webhook in text channel.
* `delete_webhook`: Delete webhook by ID.
* `list_webhooks`: List webhooks in channel or server.
* `send_webhook_message`: Post messages via webhook with custom username and avatar.

### 18. Emojis & Stickers (8 Tools)
* `list_emojis`: List custom server emojis.
* `get_emoji_details`: Get emoji author and animated state.
* `create_emoji`: Upload new custom emoji.
* `edit_emoji`: Rename or restrict emoji to roles.
* `delete_emoji`: Delete emoji.
* `list_stickers`: List custom stickers.
* `create_sticker`: Upload custom sticker.
* `delete_sticker`: Delete sticker.

### 19. Bot System (2 Tools)
* `get_bot_info`: Retrieve connection ping, uptime, and connected guild statistics.
* `generate_bot_invite_url`: Generate OAuth2 invite link with custom permissions bitfield.

---

## 🚀 Quickstart

### 1. Installation
```bash
git clone https://github.com/your-username/discp.git
cd discp
npm install
npm run build
```

### 2. Configuration
Copy `.env.example` to `.env`:
```env
# 'user' (selfbot/alt token) or 'bot' (Discord bot token)
DISCORD_ACCOUNT_TYPE=user
DISCORD_TOKEN=your_token_here
DISCORD_GUILD_ID=your_default_server_id_here
```

### 3. Add to Claude Desktop
In `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["path/to/discp/dist/index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_GUILD_ID"
      }
    }
  }
}
```

### 4. Add to Cursor
In `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "discp": {
      "command": "node",
      "args": ["path/to/discp/dist/index.js"],
      "env": {
        "DISCORD_ACCOUNT_TYPE": "user",
        "DISCORD_TOKEN": "YOUR_TOKEN",
        "DISCORD_GUILD_ID": "YOUR_GUILD_ID"
      }
    }
  }
}
```

---

## 📜 License
MIT License.
