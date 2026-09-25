import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { config } from './config/env.js';
import { getBotData, saveBotData, initializeUser } from './data/dataManager.js';
import { getDailyMotivationWithTelemetry } from './services/brain.js';
import { logAnalytics } from './services/telemetry.js';
import { registerCommands } from './bot/commands.js';
import { registerActions } from './bot/actions.js';

// --- INITIALIZATION ---
const bot = new TelegramBot(config.botToken, { polling: !config.isTestMode });

// Register Bot Routers
registerCommands(bot);
registerActions(bot);

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];

// --- AUTOMATED DISPATCH (CRON) ---
const sendTelegramMessage = async () => {
  try {
    const generationData = await getDailyMotivationWithTelemetry(config.adminChatId);

    if (generationData.adminAlert) {
      bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
        .catch(e => console.error("Failed to send admin alert:", e));
    }

    logAnalytics({
      event: "cron_daily_quote",
      quoteText: generationData.quote,
      source: generationData.source,
      responseTimeMs: generationData.responseTimeMs,
      apiSuccess: generationData.success,
      error: generationData.errorType || null,
      errorMessage: generationData.errorMessage || null
    }).catch(err => console.error("Failed to write log:", err));

    let data = await getBotData();

    // Ensure user exists before incrementing streak from cron
    data = initializeUser(data, config.adminChatId);

    data.history.unshift(generationData.quote);
    if (data.history.length > 7) data.history.pop();

    // Auto-increment streak for the scheduled daily send
    data.users[config.adminChatId].streak += 1;
    data.users[config.adminChatId].lastActive = new Date().toISOString();

    await saveBotData(data);

    // Format UI for Cron Dispatch
    const userStreak = data.users[config.adminChatId].streak;
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const finalMessage = `✨ **Daily Maxim - Streak #${userStreak}** ${randomEmoji}\n\n_${generationData.quote}_`;

    const opts = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👍', callback_data: 'vote_up' },
            { text: '👎', callback_data: 'vote_down' }
          ]
        ]
      }
    };

    await bot.sendMessage(config.adminChatId, finalMessage, opts);
    return true;

  } catch (error) {
    console.error("Telegram Dispatch Error:", error);
    return false;
  }
};

// --- EXECUTION LOGIC ---
if (config.isTestMode) {
  console.log("🚀 Running Script For Local Testing");

  (async () => {
    let data = await getBotData();
    data = initializeUser(data, config.adminChatId);
    await saveBotData(data);

    const success = await sendTelegramMessage();
    if (success) {
      console.log("✅ Success! Motivation sent to Telegram. exiting...");
      process.exit(0);
    } else {
      console.log("❌ Test failed. Check logs above.");
      process.exit(1);
    }
  })();
} else {
  (async () => {
    let data = await getBotData();
    data = initializeUser(data, config.adminChatId);
    await saveBotData(data);
  })();

  cron.schedule('0 8 * * *', () => {
    console.log("Executing scheduled morning briefing...");
    sendTelegramMessage();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log("System Standby: Next Maximizing scheduled for 08:00 AM IST (Asia/Kolkata). Commands are now live.");
}