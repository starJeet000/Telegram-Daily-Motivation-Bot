# 🌅 Morning Maxim Bot (@CheifMotivationbot)

A scalable **Node.js** automation that serves as your personal high-performance life coach. The bot uses **Google Gemini AI** to generate a unique, punchy, and powerful maxim to kickstart your day, delivered straight to your **Telegram**.

Originally a single-user script, the bot has been re-architected into a multi-user, MERN-style backend supporting group chats, advanced scheduling, and localized preferences.

## 🚀 Core Features

- **AI-Powered:** Uses the `gemini-3-flash-preview` model to generate fresh, non-repetitive quotes.
- **Multi-User & Group Compatible:** Operates securely in individual DMs or shared group chats.
- **Advanced Scheduling:** Runs on a precise cron schedule using `node-cron`. Users can opt into Morning (8:00 AM IST), Midday, Evening, and Weekly dispatches.
- **Dynamic Personalization:** Users control their own experience via `/set_tone` and `/set_language`.
- **Zero-Cost Database:** Relies entirely on a robust local JSON file structure for telemetry, user state, and caching (no external database costs).
- **Resilient:** Features a robust fallback system—if the AI is offline, the bot pulls from a curated list of legendary quotes from visionaries like Carrie Fisher and Frederick Douglass.

## 🏗️ System Architecture

The codebase is structured into isolated modules for strict separation of concerns:

```text
├── database/               # Local JSON storage (auto-generated)
│   ├── config.json         # Dynamic system configurations
│   ├── quotes.json         # Localized fallback quotes
│   ├── users.json          # User states, streaks, and schedules
│   └── logs-YYYY-MM.json   # Monthly rotating telemetry logs
├── src/
│   ├── bot/
│   │   ├── actions.js      # Inline keyboard handlers
│   │   ├── admin.js        # RBAC protected admin routes
│   │   └── commands.js     # Public user command routers
│   ├── config/
│   │   └── env.js          # Environment variable gatekeeper
│   ├── data/
│   │   └── dataManager.js  # File I/O and JSON abstraction layer
│   └── services/
│       ├── brain.js        # Gemini API integration and retry logic
│       └── telemetry.js    # Event logging system
├── .env.example
├── index.js                # Main orchestrator and cron schedules
└── package.json

```

## 🛠️ Tech Stack

- **Language:** Node.js (ES6 Modules)

- **AI Engine:** Google Generative AI (Gemini API)

- **Platform:** Telegram Bot API

- **Scheduling:** Node-Cron

## 📋 Prerequisites

Before starting, you will need:

1. **Node.js** installed on your machine.

2. A **Telegram Bot Token** (get it from [@BotFather](https://t.me/botfather?utm_source=gemini)).

3. Your **Telegram Chat ID** (get it from [@userinfobot](https://t.me/userinfobot?utm_source=gemini)). _Note: This is used to grant you Admin access._

4. A **Google Gemini API Key** (get it from [Google AI Studio](https://aistudio.google.com/?utm_source=gemini))[cite: 12].

## ⚙️ Setup & Local Testing

1. **Clone the repository:**

   Bash

   ```
   git clone [https://github.com/starJeet000/Telegram-Daily-Motivation-Bot.git](https://github.com/starJeet000/Telegram-Daily-Motivation-Bot.git)
   cd telegram-daily-motivation-bot

   ```

2. **Install dependencies:**

   Bash

   ```
   npm install

   ```

3. **Configure Environment Variables:**

   Copy `.env.example` to `.env` and add your keys:

   Code snippet

   ```
   GEMINI_API_KEY=your_gemini_key_here
   TELEGRAM_BOT_API_TOKEN=your_telegram_token_here
   TELEGRAM_CHAT_ID=your_admin_chat_id_here

   ```

4. **Local Testing Mode:** To verify that your bot is working and send an immediate message to your Telegram, run:[cite: 12]

   Bash

   ```
   npm run test

   ```

   _This executes `node index.js --test`, sending one message and automatically exiting._

   [cite: 12]

## 🎮 Command Reference

### User Commands

- `/start` or `/help` - Initialize profile and view commands.

- `/motivate` - Generate an on-demand quote.

- `/today` - Recall the most recently dispatched daily quote.

- `/schedule` - Toggle Morning, Midday, Evening, or Weekly deliveries.

- `/subscribe` / `/unsubscribe` - Master toggle for automated messages.

- `/set_tone <vibe>` - Change your quote generation persona (e.g., _Stoic, Aggressive_).

- `/set_language <lang>` - Change your delivery language (e.g., _Spanish, Hindi_).

- `/history` - View the last 7 generated quotes.

- `/stats` - View your engagement streak.

### Admin Commands (Requires Authorized `TELEGRAM_CHAT_ID`)

- `/config` - View dynamic system configurations.

- `/set_config <key> <value>` - Update max retries, fallback toggles, or analytics state on the fly.

- `/admin_stats` - View total users, active users, and database size.

- `/admin_users` - View the active roster and their streaks.

- `/admin_broadcast <message>` - Push an announcement to all active subscribers.

## 🌩️ Production Deployment

Because this bot utilizes a local JSON database and continuous long-polling for real-time interactive commands, it requires a persistent host (e.g., a VPS, Raspberry Pi, or a service like Render/Railway) rather than ephemeral GitHub Actions.

To start the bot in "Standby Mode" (where it handles commands and waits for cron schedules), run:[cite: 12]

Bash

```
npm start

```

_(Executes `node index.js`)_

_Built with grit and logic._

[cite: 12]
