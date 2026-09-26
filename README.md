# 🌅 Morning Maxim Bot (@CheifMotivationbot)

A scalable **Node.js** automation that serves as your personal high-performance life coach. The bot uses **Google Gemini AI** to generate a unique, punchy, and powerful maxim to kickstart your day, delivered straight to your **Telegram**.

Originally a single-user script, the bot has been re-architected into a multi-user, MERN-style backend supporting group chats, advanced scheduling, localized preferences, and REST API webhook integrations.

## 🚀 Core Features

- **AI-Powered:** Uses the `gemini-3-flash-preview` model to generate fresh, non-repetitive quotes.
- **A/B Testing Engine:** Automatically separates users into cohorts to test aggressive vs. standard AI personas, logging approval ratings to determine the most effective tone.
- **REST API & Webhooks:** Features an integrated Express server allowing external applications to query quote history or push broadcast alerts directly to subscribers.
- **Multi-User & Group Compatible:** Operates securely in individual DMs or shared group chats.
- **Advanced Scheduling:** Runs on a precise cron schedule using `node-cron`. Users can opt into Morning (8:00 AM IST), Midday, Evening, and Weekly dispatches.
- **Zero-Cost Database:** Relies entirely on a robust local JSON file structure for telemetry, user state, and caching (no external database costs).
- **Self-Healing Fallbacks:** Features an in-memory caching system and smart rotation algorithm. If the AI is offline, the bot pulls from a curated list of legendary quotes while guaranteeing no repetitions within a 30-day window.

## 🏗️ System Architecture

The codebase is structured into isolated modules for strict separation of concerns:

```text
├── database/               # Local JSON storage (auto-generated)
│   ├── config.json         # Dynamic system configurations
│   ├── quotes.json         # Localized fallback quotes
│   ├── users.json          # User states, streaks, and schedules
│   ├── feedback.json       # A/B testing analytics and vote telemetry
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
├── index.js                # Main orchestrator, Express server, and cron schedules
└── package.json

```

## 🛠️ Tech Stack

- **Language:** Node.js (ES6 Modules)

- **Web Server:** Express.js

- **AI Engine:** Google Generative AI (Gemini API)

- **Platform:** Telegram Bot API

- **Scheduling:** Node-Cron

- **Testing:** Jest

## 📋 Prerequisites

Before starting, you will need:

1. **Node.js** installed on your machine.

2. A **Telegram Bot Token**.

3. Your **Telegram Chat ID** to grant Admin access.

4. A **Google Gemini API Key**.

## ⚙️ Setup & Local Testing

1. **Clone the repository:**

   ```bash
   git clone https://github.com/starJeet000/Telegram-Daily-Motivation-Bot.git
   cd telegram-daily-motivation-bot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**

   Copy `.env.example` to `.env` and add your keys:

   ```
   PORT=3000
   WEBHOOK_SECRET=your_super_secret_api_key_here
   GEMINI_API_KEY=your_gemini_key_here
   TELEGRAM_BOT_API_TOKEN=your_telegram_token_here
   TELEGRAM_CHAT_ID=your_admin_chat_id_here
   ```

4. **Start the System:**

   ```bash
   npm start
   ```

## 🎮 Command Reference

### User Commands

- `/start` or `/help` - Initialize profile and view commands.

- `/motivate` - Generate an on-demand quote.

- `/suggest_quote_topic <topic>` - Force the AI to focus on a specific problem.

- `/schedule` - Toggle Morning, Midday, Evening, or Weekly deliveries.

- `/set_tone <vibe>` - Change your quote generation persona (e.g., Stoic, Aggressive).

- `/set_language <lang>` - Change your delivery language (e.g., Spanish, Hindi).

- `/stats` - View your engagement streak.

- `/leaderboard` - View top global streaks anonymously.

### Admin Commands

- `/config` - View dynamic system configurations.

- `/webhook` - View active Express API endpoints and secret keys.

- `/admin_report` - View real-time A/B testing approval rates based on user feedback.

- `/admin_broadcast <message>` - Push an announcement to all active subscribers.

## 🌩️ Production Deployment

Because this bot utilizes a local JSON database, Express server, and continuous long-polling for real-time interactive commands, it requires a persistent host (e.g., a VPS, Raspberry Pi, or a service like Render/Railway) rather than ephemeral GitHub Actions.

The system automatically starts both the Telegram bot and Express webhook server on the configured `PORT`:

```bash
npm start
```

_(Executes `node index.js` with full Express + Telegram integration)_

**Built with grit and logic.**
