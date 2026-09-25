import { getBotData, saveBotData, initializeUser } from '../data/dataManager.js';
import { logAnalytics } from '../services/telemetry.js';
import { getDailyMotivationWithTelemetry } from '../services/brain.js';
import { config } from '../config/env.js';

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];
function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

export function registerCommands(bot) {

  // NEW: Welcome command
  bot.onText(/\/(start|help)/, async (msg) => {
    const chatId = msg.chat.id;

    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const helpText = `
🤖 **Motivation Bot Commands:**
/motivate - Get an instant motivational quote
/today - Re-read today's active quote
/subscribe - Opt-in to the daily 8:00 AM dispatch
/unsubscribe - Opt-out of the daily dispatch
/schedule - Manage your daily check-ins
/history - View the last 7 quotes
/stats - Check your engagement streak
/settings - View your personalization settings
/set_tone <tone> - e.g., /set_tone aggressive warrior
/set_language <lang> - e.g., /set_language Spanish
/help - Show this menu
        `;
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/subscribe/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);

    data.users[chatId].subscribed = true;
    data.users[chatId].archived = false;
    await saveBotData(data);

    bot.sendMessage(chatId, "✅ **Subscribed!** You will receive your daily maxim every morning at 08:00 AM IST.", { parse_mode: 'Markdown' });
  });

  bot.onText(/\/unsubscribe/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);

    data.users[chatId].subscribed = false;
    await saveBotData(data);

    bot.sendMessage(chatId, "🔇 **Unsubscribed.** You will no longer receive the automated daily dispatches. You can still use /motivate manually.", { parse_mode: 'Markdown' });
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const prefs = data.users[chatId].preferences;
    const subStatus = data.users[chatId].subscribed ? "✅ Active" : "🔇 Inactive";

    const settingsText = `
⚙️ **Current Preferences (Chat ID: ${chatId}):**
**Daily Dispatch:** ${subStatus}
**Tone:** ${prefs.tone}
**Language:** ${prefs.language}
**Timezone:** ${prefs.timezone}

*Change settings using /set_tone, /set_language, /subscribe, or /unsubscribe*`;

    bot.sendMessage(chatId, settingsText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_tone (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newTone = match[1];

    let data = await getBotData();
    data = initializeUser(data, chatId);
    data.users[chatId].preferences.tone = newTone;
    await saveBotData(data);

    bot.sendMessage(chatId, `✅ Tone updated to: **${newTone}**\nYour next quotes will reflect this vibe.`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_language (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const newLang = match[1];

    let data = await getBotData();
    data = initializeUser(data, chatId);
    data.users[chatId].preferences.language = newLang;
    await saveBotData(data);

    bot.sendMessage(chatId, `✅ Language updated to: **${newLang}**`, { parse_mode: 'Markdown' });
  });

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

    bot.sendMessage(chatId, "✨ Channeling some inspiration...");

    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const generationData = await getDailyMotivationWithTelemetry(chatId);

    if (generationData.adminAlert) {
      bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' })
        .catch(e => console.error("Failed to send admin alert:", e));
    }

    logAnalytics({
      event: "on_demand_quote",
      chatId: chatId,
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

      data.users[chatId].streak += 1;
      data.users[chatId].lastActive = new Date().toISOString();

      await saveBotData(data);

      const userStreak = data.users[chatId].streak;
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
      console.error("Error processing stats:", error);
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
    const data = await getBotData();

    const userStats = data.users[chatId];
    if (!userStats || userStats.streak === 0) {
      bot.sendMessage(chatId, "No streak built up yet. Use /motivate to start!");
      return;
    }

    bot.sendMessage(chatId, `🔥 **Engagement Streak:** ${userStats.streak} interactions.\nKeep up the momentum!`, { parse_mode: 'Markdown' });
  });

  // NEW: Interactive Scheduling
  bot.onText(/\/schedule$/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const sched = data.users[chatId].schedule || { morning: data.users[chatId].subscribed !== false, midday: false, evening: false, weekly: false };
    const text = `
🗓️ **Your Delivery Schedule:**
🌅 Morning (8 AM): ${sched.morning ? "✅" : "❌"}
☀️ Midday (1 PM): ${sched.midday ? "✅" : "❌"}
🌙 Evening (6 PM): ${sched.evening ? "✅" : "❌"}
📅 Weekly (Sun 7 PM): ${sched.weekly ? "✅" : "❌"}

*Toggle a specific time using:* \`/schedule <time>\` *(e.g., /schedule midday)*`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/schedule (morning|midday|evening|weekly)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const period = match[1].toLowerCase();

    let data = await getBotData();
    data = initializeUser(data, chatId);

    if (!data.users[chatId].schedule) {
      data.users[chatId].schedule = { morning: data.users[chatId].subscribed !== false, midday: false, evening: false, weekly: false };
    }
    data.users[chatId].schedule[period] = !data.users[chatId].schedule[period];
    await saveBotData(data);

    const status = data.users[chatId].schedule[period] ? "✅ Enabled" : "❌ Disabled";
    bot.sendMessage(chatId, `Schedule updated! **${period.charAt(0).toUpperCase() + period.slice(1)}** dispatch is now: ${status}`, { parse_mode: 'Markdown' });
  });
}