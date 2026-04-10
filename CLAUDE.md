# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Bot

```bash
node bot.js
```

On first run, a QR code is displayed in the terminal — scan it with WhatsApp to authenticate. Session is persisted via `LocalAuth` (stored under `.wwebjs_auth/`).

No build step, no linter, and no test framework is configured.

## Architecture

This is a Node.js WhatsApp RPG bot for Cyberpunk-themed group campaigns. The bot manages one game state per WhatsApp group, routing text commands from group messages to game logic handlers.

**Entry point**: `bot.js` — initializes the WhatsApp client (`whatsapp-web.js` with Puppeteer headless Chromium), registers the `message` event listener, and handles all command routing via regex matching.

**Game state**: `gameManager.js` — `GameManager` class holds per-group state: players (Map of userId → `{name, character, actions[]}`), whose turn it is, and an action log. A top-level `games` Map in `bot.js` keys `GameManager` instances by group ID.

**Dice system**: `dice.js` — D20 rolls with difficulty class (DC) lookup based on action keywords. Results are categorized: critical success (20), success (≥ DC), failure (< DC), critical fail (1).

**Narrative content**: `narratives.js` — Pre-written campaign text (intro, turn prompts, action outcomes, NPC dialogues, scene descriptions). Functions return strings based on roll outcomes and action types.

## Key Patterns

- Commands are matched with `message.body.startsWith('!command')` or regex and only processed in group chats (`message.from.endsWith('@g.us')`).
- Each group gets its own `GameManager` instance created lazily on first command.
- No persistence — all game state is lost on restart.
- WhatsApp formatting: bold uses `*text*`, responses include emojis and line breaks (`\n`).

## Dependencies

- `whatsapp-web.js` — WhatsApp Web client (requires Chrome/Chromium)
- `qrcode-terminal` — renders QR code in terminal for auth

Puppeteer is configured with `--no-sandbox` and `--disable-setuid-sandbox` (standard for Linux environments without a proper sandbox).
