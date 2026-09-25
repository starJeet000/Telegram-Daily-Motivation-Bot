import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { config } from './config/env.js';
import { getBotData, saveBotData, initializeUser, archiveInactiveUsers } from './data/dataManager.js';
import { getDailyMotivationWithTelemetry } from './services/brain.js';
import { logAnalytics } from './services/telemetry.js';
import { registerCommands } from './bot/commands.js';
import { registerActions } from './bot/actions.js';
import { registerAdmin } from './bot/admin.js';

const bot = new TelegramBot(config.botToken, { polling: !config.isTestMode });

registerCommands(bot);
registerActions(bot);
registerAdmin(bot);

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUTOMATED DISPATCH (CRON) ---
const dispatchScheduledMessages = async (scheduleType) => {
  console.log(`🚀 Starting ${scheduleType} dispatch...`);
  let data = await getBotData();

  // Filter for active users who have THIS specific schedule period enabled
  const activeSubscribers = Object.entries(data.users).filter(
    ([id, user]) => !user.archived && user.schedule && user.schedule[scheduleType] === true
  );

  let successCount = 0;

  for (const [chatId, user] of activeSubscribers) {
    try {
      const generationData = await getDailyMotivationWithTelemetry(chatId, scheduleType);

      if (generationData.adminAlert) {
        bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
          .catch(e => console.error("Failed to send admin alert:", e));
      }

      logAnalytics({
        event: "cron_daily_quote",
        chatId: chatId,
        schedulePeriod: scheduleType,
        quoteText: generationData.quote,
        source: generationData.source,
        responseTimeMs: generationData.responseTimeMs,
        apiSuccess: generationData.success
      }).catch(err => console.error("Failed to write log:", err));

      data = await getBotData();

      data.history.unshift(generationData.quote);
      if (data.history.length > 7) data.history.pop();

      data.users[chatId].streak += 1;
      data.users[chatId].lastActive = new Date().toISOString();

      await saveBotData(data);

      const userStreak = data.users[chatId].streak;
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      const periodLabel = scheduleType === "morning" ? "Daily Maxim" : scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1) + " Check-in";
      const finalMessage = `✨ **${periodLabel} - Streak #${userStreak}** ${randomEmoji}\n\n_${generationData.quote}_`;

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

      await bot.sendMessage(chatId, finalMessage, opts);
      successCount++;

      await delay(2000);

    } catch (error) {
      console.error(`Failed to dispatch to Chat ID ${chatId}:`, error);
    }
  }

  console.log(`✅ ${scheduleType} dispatch complete. Sent successfully to ${successCount}/${activeSubscribers.length} chats.`);
  return successCount > 0;
};

// --- EXECUTION LOGIC ---
if (config.isTestMode) {
  console.log("🚀 Running Script For Local Testing");
  (async () => {
    const success = await dispatchScheduledMessages('morning');
    if (success) {
      console.log("✅ Success! Exiting...");
      process.exit(0);
    } else {
      console.log("❌ Test failed or no subscribers active.");
      process.exit(1);
    }
  })();
} else {
  // 🌅 Morning: 8:00 AM Daily
  cron.schedule('0 8 * * *', () => {
    dispatchScheduledMessages('morning');
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  // ☀️ Midday: 1:00 PM Daily
  cron.schedule('0 13 * * *', () => {
    dispatchScheduledMessages('midday');
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  // 🌙 Evening: 6:00 PM Daily
  cron.schedule('0 18 * * *', () => {
    dispatchScheduledMessages('evening');
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  // 📅 Weekly: Sunday 7:00 PM
  cron.schedule('0 19 * * 0', () => {
    dispatchScheduledMessages('weekly');
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  cron.schedule('0 0 * * *', () => {
    console.log("Running automated database cleanup...");
    archiveInactiveUsers();
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  console.log("System Standby: Group Multi-User Mode & Advanced Scheduling Active.");
}