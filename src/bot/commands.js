import { getBotData, saveBotData, initializeUser } from '../data/dataManager.js';
import { logAnalytics } from '../services/telemetry.js';
import { getDailyMotivationWithTelemetry } from '../services/brain.js';
import { config } from '../config/env.js';

// UI Formatting Helper
const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];
function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

export function registerCommands(bot) {
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
🤖 **Motivation Bot Commands:**
/motivate - Get an instant motivational quote
/today - Re-read today's active quote
/history - View the last 7 quotes
/stats - Check your engagement streak
/settings - View your personalization settings
/set_tone <tone> - e.g., /set_tone aggressive warrior
/set_language <lang> - e.g., /set_language Spanish
/help - Show this menu
        `;
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let data = await getBotData();
    data = initializeUser(data, userId);
    await saveBotData(data);

    const prefs = data.users[userId].preferences;
    const settingsText = `
⚙️ **Your Current Preferences:**
**Tone:** ${prefs.tone}
**Language:** ${prefs.language}
**Timezone:** ${prefs.timezone}
**Frequency:** ${prefs.frequency}

*Change these using /set_tone and /set_language*`;

    bot.sendMessage(chatId, settingsText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_tone (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const newTone = match[1];

    let data = await getBotData();
    data = initializeUser(data, userId);
    data.users[userId].preferences.tone = newTone;
    await saveBotData(data);

    bot.sendMessage(chatId, `✅ Tone updated to: **${newTone}**\nYour next quotes will reflect this vibe.`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_language (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const newLang = match[1];

    let data = await getBotData();
    data = initializeUser(data, userId);
    data.users[userId].preferences.language = newLang;
    await saveBotData(data);

    bot.sendMessage(chatId, `✅ Language updated to: **${newLang}**`, { parse_mode: 'Markdown' });
  });

  // NEW COMMAND: /today
  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const data = await getBotData();

    if (data.history.length === 0) {
      bot.sendMessage(chatId, "No quotes generated yet! Run /motivate to start your journey.", { parse_mode: 'Markdown' });
      return;
    }

    const latestQuote = data.history[0];
    const formattedMessage = `✨ **Today's Maxim** ${getRandomEmoji()}\n\n_${latestQuote}_`;

    bot.sendMessage(chatId, formattedMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/motivate/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    bot.sendMessage(chatId, "✨ Channeling some inspiration...");

    let data = await getBotData();
    data = initializeUser(data, userId);
    await saveBotData(data);

    const generationData = await getDailyMotivationWithTelemetry(userId);

    if (generationData.adminAlert) {
      bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
        .catch(e => console.error("Failed to send admin alert:", e));
    }

    logAnalytics({
      event: "on_demand_quote",
      userId: userId,
      quoteText: generationData.quote,
      source: generationData.source,
      responseTimeMs: generationData.responseTimeMs,
      apiSuccess: generationData.success,
      error: generationData.errorType || null,
      errorMessage: generationData.errorMessage || null
    }).catch(err => console.error("Failed to write log:", err));

    try {
      data = await getBotData();

      data.history.unshift(generationData.quote);
      if (data.history.length > 7) data.history.pop();

      data.users[userId].streak += 1;
      data.users[userId].lastActive = new Date().toISOString();

      await saveBotData(data);

      // Apply UX Formatting
      const userStreak = data.users[userId].streak;
      const formattedMessage = `✨ **Daily Maxim - Streak #${userStreak}** ${getRandomEmoji()}\n\n_${generationData.quote}_`;

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
      bot.sendMessage(chatId, formattedMessage, opts);
    } catch (error) {
      console.error("Error processing user stats:", error);
      bot.sendMessage(chatId, `_${generationData.quote}_`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const data = await getBotData();

    if (data.history.length === 0) {
      bot.sendMessage(chatId, "No history available yet. Run /motivate to get started!");
      return;
    }

    const historyText = data.history.map((q, i) => `${i + 1}. _${q}_`).join('\n\n');
    bot.sendMessage(chatId, `📜 **Last ${data.history.length} Quotes:**\n\n${historyText}`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const data = await getBotData();

    const userStats = data.users[userId];
    if (!userStats || userStats.streak === 0) {
      bot.sendMessage(chatId, "You haven't built a streak yet. Use /motivate to start!");
      return;
    }

    bot.sendMessage(chatId, `🔥 **Your Engagement Streak:** ${userStats.streak} interactions.\nKeep up the momentum!`, { parse_mode: 'Markdown' });
  });
}