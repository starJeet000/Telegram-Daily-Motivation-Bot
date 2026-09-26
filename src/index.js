import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { getBotData, saveBotData, archiveInactiveUsers } from './data/dataManager.js';
import { getDailyMotivationWithTelemetry } from './services/brain.js';
import { logAnalytics } from './services/telemetry.js';
import { registerCommands } from './bot/commands.js';
import { registerActions } from './bot/actions.js';
import { registerAdmin } from './bot/admin.js';

// --- EXPRESS API & WEBHOOK SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/quotes/latest', async (req, res) => {
  try {
    const data = await getBotData();
    res.json({ success: true, count: data.history.length, history: data.history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
  }
});

app.post('/api/webhook/broadcast', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== config.webhookSecret) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message payload required' });
  }

  const data = await getBotData();
  const activeUsers = Object.entries(data.users).filter(([id, user]) => !user.archived);

  // Fire and forget batched broadcast so the HTTP request doesn't hang
  (async () => {
    let successCount = 0;
    const BATCH_SIZE = 25;
    const BATCH_DELAY = 1500;

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async ([id, _user]) => {
        try {
          await bot.sendMessage(id, `📢 **External System Alert:**\n\n${message}`, { parse_mode: 'Markdown' });
          successCount++;
        } catch (err) {
          console.error(`Failed to broadcast to ${id}:`, err.message);
        }
      });

      await Promise.all(batchPromises);
      if (i + BATCH_SIZE < activeUsers.length) await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    console.log(`Webhook broadcast complete. Sent to ${successCount} users.`);
  })();

  res.json({ success: true, status: 'Broadcast sequence initiated', targetedUsers: activeUsers.length });
});

app.listen(config.port, () => {
  console.log(`🌐 Express API & Webhook server running on port ${config.port}`);
});

// --- TELEGRAM BOT INITIALIZATION ---
const bot = new TelegramBot(config.botToken, { polling: !config.isTestMode });

registerCommands(bot);
registerActions(bot);
registerAdmin(bot);

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkMilestone = async (chatId, streak) => {
  let milestoneMsg = null;
  if (streak === 7) milestoneMsg = "🎉 **Milestone Unlocked!** You've reached a 7-day streak and earned the rank of **7-Day Believer ⚔️**!";
  if (streak === 14) milestoneMsg = "🎉 **Milestone Unlocked!** 14 days of discipline. You are now **Unbreakable 💎**!";
  if (streak === 30) milestoneMsg = "🎉 **Milestone Unlocked!** 30 days of relentless focus. You have an **Iron Will 🛡️**!";
  if (streak === 100) milestoneMsg = "👑 **LEGENDARY MILESTONE!** 100 days of mastery. Welcome to the **Century Member** club!";

  if (milestoneMsg) {
    await bot.sendMessage(chatId, milestoneMsg, { parse_mode: 'Markdown' });
  }
};

// --- AUTOMATED DISPATCH (CRON) ---
const dispatchScheduledMessages = async (scheduleType) => {
  console.log(`🚀 Starting ${scheduleType} dispatch...`);
  let data = await getBotData();

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
      await checkMilestone(chatId, userStreak);

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
  cron.schedule('0 8 * * *', () => { dispatchScheduledMessages('morning'); }, { scheduled: true, timezone: "Asia/Kolkata" });
  cron.schedule('0 13 * * *', () => { dispatchScheduledMessages('midday'); }, { scheduled: true, timezone: "Asia/Kolkata" });
  cron.schedule('0 18 * * *', () => { dispatchScheduledMessages('evening'); }, { scheduled: true, timezone: "Asia/Kolkata" });
  cron.schedule('0 19 * * 0', () => { dispatchScheduledMessages('weekly'); }, { scheduled: true, timezone: "Asia/Kolkata" });

  cron.schedule('0 0 * * *', () => {
    console.log("Running automated database cleanup...");
    archiveInactiveUsers();
  }, { scheduled: true, timezone: "Asia/Kolkata" });

  console.log("System Standby: Group Multi-User Mode & Advanced Scheduling Active.");
}