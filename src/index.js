import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { config } from './config/env.js';
import { getBotData, saveBotData, initializeUser, archiveInactiveUsers } from './data/dataManager.js';
import { getDailyMotivationWithTelemetry } from './services/brain.js';
import { logAnalytics } from './services/telemetry.js';
import { registerCommands } from './bot/commands.js';
import { registerActions } from './bot/actions.js';
import { registerAdmin } from './bot/admin.js';

// --- INITIALIZATION ---
const bot = new TelegramBot(config.botToken, { polling: !config.isTestMode });[cite, 9]

// Register Bot Routers
registerCommands(bot);[cite, 9]
registerActions(bot);[cite, 9]
registerAdmin(bot);

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];[cite, 9]

// --- AUTOMATED DISPATCH (CRON) ---
const sendTelegramMessage = async () => {
  try {
    const generationData = await getDailyMotivationWithTelemetry(config.adminChatId);[cite, 9]

    if (generationData.adminAlert) {
      bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
        .catch(e => console.error("Failed to send admin alert:", e));[cite, 9]
    }

    logAnalytics({
      event: "cron_daily_quote",
      quoteText: generationData.quote,
      source: generationData.source,
      responseTimeMs: generationData.responseTimeMs,
      apiSuccess: generationData.success,
      error: generationData.errorType || null,
      errorMessage: generationData.errorMessage || null
    }).catch(err => console.error("Failed to write log:", err));[cite, 9]

    let data = await getBotData();[cite, 9]

    // Ensure user exists before incrementing streak from cron
    data = initializeUser(data, config.adminChatId);[cite, 9]

    data.history.unshift(generationData.quote);[cite, 9]
    if (data.history.length > 7) data.history.pop();[cite, 9]

    // Auto-increment streak for the scheduled daily send
    data.users[config.adminChatId].streak += 1;[cite, 9]
    data.users[config.adminChatId].lastActive = new Date().toISOString();[cite, 9]

    await saveBotData(data);[cite, 9]

    // Format UI for Cron Dispatch
    const userStreak = data.users[config.adminChatId].streak;[cite, 9]
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];[cite, 9]
    const finalMessage = `✨ **Daily Maxim - Streak #${userStreak}** ${randomEmoji}\n\n_${generationData.quote}_`;[cite, 9]

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
    };[cite, 9]

    await bot.sendMessage(config.adminChatId, finalMessage, opts);[cite, 9]
    return true;[cite, 9]

  } catch (error) {
    console.error("Telegram Dispatch Error:", error);[cite, 9]
    return false;[cite, 9]
  }
};[cite, 9]

// --- EXECUTION LOGIC ---
if (config.isTestMode) {
  console.log("🚀 Running Script For Local Testing");[cite, 9]

    (async () => {
      let data = await getBotData();[cite, 9]
      data = initializeUser(data, config.adminChatId);[cite, 9]
      await saveBotData(data);[cite, 9]

      const success = await sendTelegramMessage();[cite, 9]
      if (success) {
        console.log("✅ Success! Motivation sent to Telegram. exiting...");[cite, 9]
        process.exit(0);[cite, 9]
      } else {
        console.log("❌ Test failed. Check logs above.");[cite, 9]
        process.exit(1);[cite, 9]
      }
    })();[cite, 9]
} else {
  (async () => {
    let data = await getBotData();[cite, 9]
    data = initializeUser(data, config.adminChatId);[cite, 9]
    await saveBotData(data);[cite, 9]
  })();[cite, 9]

  // Primary Dispatch: 8:00 AM IST daily
  cron.schedule('0 8 * * *', () => {
    console.log("Executing scheduled morning briefing...");[cite, 9]
    sendTelegramMessage();[cite, 9]
  }, {
    scheduled: true[cite, 9],
    timezone: "Asia/Kolkata"[cite, 9]
  });[cite, 9]

  // Database Maintenance: Midnight IST daily
  cron.schedule('0 0 * * *', () => {
    console.log("Running automated database cleanup...");
    archiveInactiveUsers();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log("System Standby: Next Maximizing scheduled for 08:00 AM IST (Asia/Kolkata). Commands are now live.");[cite, 9]
}