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
const dispatchToAllSubscribers = async () => {
  console.log("🚀 Starting daily dispatch to all subscribers...");
  let data = await getBotData();

  // Filter for active, subscribed users/groups
  const activeSubscribers = Object.entries(data.users).filter(
    ([id, user]) => !user.archived && user.subscribed !== false
  );

  let successCount = 0;

  for (const [chatId, user] of activeSubscribers) {
    try {
      const generationData = await getDailyMotivationWithTelemetry(chatId);

      if (generationData.adminAlert) {
        bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
          .catch(e => console.error("Failed to send admin alert:", e));
      }

      logAnalytics({
        event: "cron_daily_quote",
        chatId: chatId,
        quoteText: generationData.quote,
        source: generationData.source,
        responseTimeMs: generationData.responseTimeMs,
        apiSuccess: generationData.success
      }).catch(err => console.error("Failed to write log:", err));

      // Reload data to avoid race conditions if a user interacted during generation
      data = await getBotData();

      data.history.unshift(generationData.quote);
      if (data.history.length > 7) data.history.pop();

      data.users[chatId].streak += 1;
      data.users[chatId].lastActive = new Date().toISOString();

      await saveBotData(data);

      const userStreak = data.users[chatId].streak;
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

      await bot.sendMessage(chatId, finalMessage, opts);
      successCount++;

      // 2-second rate limit protection buffer between sends
      await delay(2000);

    } catch (error) {
      console.error(`Failed to dispatch to Chat ID ${chatId}:`, error);
    }
  }

  console.log(`✅ Daily dispatch complete. Sent successfully to ${successCount}/${activeSubscribers.length} chats.`);
  return successCount > 0;
};

// --- EXECUTION LOGIC ---
if (config.isTestMode) {
  console.log("🚀 Running Script For Local Testing");
  (async () => {
    const success = await dispatchToAllSubscribers();
    if (success) {
      console.log("✅ Success! Exiting...");
      process.exit(0);
    } else {
      console.log("❌ Test failed or no subscribers active.");
      process.exit(1);
    }
  })();
} else {
  cron.schedule('0 8 * * *', () => {
    dispatchToAllSubscribers();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  cron.schedule('0 0 * * *', () => {
    console.log("Running automated database cleanup...");
    archiveInactiveUsers();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log("System Standby: Group Multi-User Mode Active. Next dispatch scheduled for 08:00 AM IST.");
}