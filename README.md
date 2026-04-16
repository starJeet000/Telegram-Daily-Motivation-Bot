# 🌅 Morning Maxim Bot (@CheifMotivationbot)

A lightweight **Node.js** automation that serves as your personal high-performance life coach. Every morning at **8:00 AM IST**, the bot uses **Google Gemini AI** to generate a unique, punchy, and powerful maxim to kickstart your day, delivered straight to your **Telegram**.

## 🚀 Features

- **AI-Powered:** Uses the `gemini-3-flash-preview` model to generate fresh, non-repetitive quotes.
- **Automated Scheduling:** Runs on a precise cron schedule (8:00 AM IST) using `node-cron`.
- **Test Mode:** Includes a dedicated test flag to verify your setup instantly without waiting for the morning.
- **Resilient:** Features a robust fallback system—if the AI is offline, the bot pulls from a curated list of legendary quotes from visionaries like Carrie Fisher and Frederick Douglass.

## 🛠️ Tech Stack

- **Language:** Node.js (ES6 Modules)
- **AI Engine:** Google Generative AI (Gemini API)
- **Platform:** Telegram Bot API
- **Scheduling:** Node-Cron

## 📋 Prerequisites

Before starting, you will need:

1.  **Node.js** installed on your machine.
2.  A **Telegram Bot Token** (get it from [@BotFather](https://t.me/botfather)).
3.  Your **Telegram Chat ID** (get it from [@userinfobot](https://t.me/userinfobot)).
4.  A **Google Gemini API Key** (get it from [Google AI Studio](https://aistudio.google.com/)).

## ⚙️ Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/starJeet000/Telegram-Daily-Motivation-Bot.git

    cd telegram-daily-motivation-bot
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your keys:
    ```env
    GEMINI_API_KEY=your_gemini_key_here
    TELEGRAM_BOT_API_TOKEN=your_telegram_token_here
    TELEGRAM_CHAT_ID=your_chat_id_here
    ```

## 🎮 How to Use

### Local Testing

To verify that your bot is working and send an immediate message to your Telegram, run:

```bash
node index.js --test
```

Add This to your `test` script inside package.json.

_The script will send one message and then automatically exit._

### Production / Deployment

To start the bot in "Standby Mode" (where it waits for the 8:00 AM schedule), run:

```bash
node index.js
```

Add this to your `start` script inside package.json.

## 🌩️ Deployment (Github Actions )

This project runs for free using GitHub's built-in automation.

1. **Add Secrets:**
   Go to your GitHub Repo > **Settings** > **Secrets and variables** > **Actions**. Add:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_API_TOKEN`
   - `TELEGRAM_CHAT_ID`

2. **The Workflow:**
   The bot is triggered by the `.github/workflows/cron.yml` file. It is currently set to run daily at **8:00 AM IST** (02:30 UTC).

3. **Manual Trigger:**
   You can manually trigger a message anytime by going to the **Actions** tab in your GitHub repo, selecting the workflow, and clicking **Run workflow**.

---

## 💡 Customization

You can change the "vibe" of your daily quotes by editing the `prompt` variable inside `index.js`. Currently, it is set to a mix of **Motivational Speaker, Philosopher, and Warrior**.

---

_Built with grit and logic._
