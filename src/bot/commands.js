import { getBotData, saveBotData, initializeUser } from '../data/dataManager.js';
import { logAnalytics } from '../services/telemetry.js';
import { getDailyMotivationWithTelemetry } from '../services/brain.js';
import { getHistoricalQuote } from '../services/historicalQuotes.js';
import { config } from '../config/env.js';

const emojis = ["🔥", "💪", "⚡", "🎯", "🧠", "⚔️", "🚀"];
function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function getBadgeTitle(streak) {
  if (streak >= 100) return "Century Member 👑";
  if (streak >= 30) return "Iron Will 🛡️";
  if (streak >= 14) return "Unbreakable 💎";
  if (streak >= 7) return "7-Day Believer ⚔️";
  if (streak >= 3) return "Rising Star ⭐";
  return "Initiate 🌱";
}

export function registerCommands(bot) {
  bot.onText(/\/(start|help)/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const helpText = `
🤖 <b>Motivation Bot Commands:</b>
<code>/motivate</code> - Get a historical quote & AI reflection
<code>/suggest_quote_topic &lt;topic&gt;</code> - Get quotes on a specific issue
<code>/today</code> - Re-read today's active quote
<code>/subscribe</code> - Opt-in to daily dispatches
<code>/unsubscribe</code> - Opt-out of daily dispatches
<code>/schedule</code> - Manage your daily check-in times
<code>/history</code> - View the last 7 quotes
<code>/stats</code> - Check your engagement streak & rank
<code>/leaderboard</code> - View top global streaks
<code>/settings</code> - View your personalization settings
<code>/set_tone &lt;tone&gt;</code> - Choose: <i>mix, stoic, warrior, philosopher, strategist, mentor, elder, survivor, observer, wanderer</i>
<code>/set_language &lt;lang&gt;</code> - e.g., <code>/set_language Spanish</code>
<code>/help</code> - Show this menu
    `;
    bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
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
    bot.sendMessage(chatId, "🔇 **Unsubscribed.** You will no longer receive automated daily dispatches.", { parse_mode: 'Markdown' });
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);

    const prefs = data.users[chatId].preferences;
    const subStatus = data.users[chatId].subscribed ? "✅ Active" : "🔇 Inactive";
    const settingsText = `⚙️ **Current Preferences:**\n**Daily Dispatch:** ${subStatus}\n**Tone:** ${prefs.tone}\n**Language:** ${prefs.language}`;
    bot.sendMessage(chatId, settingsText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_tone (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);
    data.users[chatId].preferences.tone = match[1];
    await saveBotData(data);
    bot.sendMessage(chatId, `✅ Tone updated to: **${match[1]}**`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/set_language (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    data = initializeUser(data, chatId);
    data.users[chatId].preferences.language = match[1];
    await saveBotData(data);
    bot.sendMessage(chatId, `✅ Language updated to: **${match[1]}**`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const data = await getBotData();

    if (data.history.length === 0) {
      return bot.sendMessage(chatId, "No quotes generated yet! Run /motivate to start your journey.", { parse_mode: 'Markdown' });
    }

    const latestItem = data.history[0];
    const quoteText = typeof latestItem === 'string' ? latestItem : latestItem.quote;
    bot.sendMessage(chatId, `✨ ** Today's Maxim** ${getRandomEmoji()}\n\n_${quoteText}_`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/motivate/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "✨ Searching history & crafting reflection...");

    let data = await getBotData();
    data = initializeUser(data, chatId);
    await saveBotData(data);

    const userLanguage = data.users[chatId]?.preferences?.language || "English";

    // Fetch historical quote and AI reflection concurrently
    const [historyData, generationData] = await Promise.all([
      getHistoricalQuote(userLanguage),
      getDailyMotivationWithTelemetry(chatId, "on_demand")
    ]);

    if (generationData.adminAlert) {
      bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' }).catch(() => { });
    }

    logAnalytics({
      event: "on_demand_quote",
      chatId: chatId,
      quoteText: historyData.quote,
      quoteAuthor: historyData.author,
      source: historyData.source,
      responseTimeMs: generationData.responseTimeMs,
      apiSuccess: historyData.success && generationData.success
    }).catch(() => { });

    try {
      data = await getBotData();

      const combinedRecord = {
        quote: `"${historyData.quote}" — ${historyData.author}`,
        aiReflection: generationData.quote,
        source: historyData.source,
        timestamp: new Date().toISOString()
      };

      data.history.unshift(combinedRecord);
      if (data.history.length > 7) data.history.pop();

      data.users[chatId].streak += 1;
      data.users[chatId].lastActive = new Date().toISOString();
      await saveBotData(data);

      const formattedMessage = `📜 **Words of Wisdom - Streak #${data.users[chatId].streak}** ${getRandomEmoji()}\n\n` +
        `"${historyData.quote}"\n— *${historyData.author}*\n\n` +
        `🧠 **AI Reflection:**\n_${generationData.quote}_`;

      bot.sendMessage(chatId, formattedMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '👍', callback_data: 'vote_up' }, { text: '👎', callback_data: 'vote_down' }]] }
      });
    } catch (error) {
      bot.sendMessage(chatId, `"${historyData.quote}"\n— *${historyData.author}*`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/suggest_quote_topic (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const topic = match[1];
    bot.sendMessage(chatId, `✨ Channeling wisdom regarding: **${topic}**...`, { parse_mode: 'Markdown' });

    let data = await getBotData();
    data = initializeUser(data, chatId);
    const userLanguage = data.users[chatId]?.preferences?.language || "English";

    const [historyData, generationData] = await Promise.all([
      getHistoricalQuote(userLanguage),
      getDailyMotivationWithTelemetry(chatId, "on_demand", topic)
    ]);

    if (generationData.adminAlert) bot.sendMessage(config.adminChatId, generationData.adminAlert, { parse_mode: 'Markdown' }).catch(() => { });

    try {
      data = await getBotData();

      const combinedRecord = {
        quote: `"${historyData.quote}" — ${historyData.author}`,
        topic: topic,
        aiReflection: generationData.quote,
        source: historyData.source,
        timestamp: new Date().toISOString()
      };

      data.history.unshift(combinedRecord);
      if (data.history.length > 7) data.history.pop();

      data.users[chatId].streak += 1;
      data.users[chatId].lastActive = new Date().toISOString();
      await saveBotData(data);

      const formattedMessage = `🎯 **Targeted Maxim [${topic}] - Streak #${data.users[chatId].streak}** ${getRandomEmoji()}\n\n` +
        `"${historyData.quote}"\n— *${historyData.author}*\n\n` +
        `🧠 **Perspective on ${topic}:**\n_${generationData.quote}_`;

      bot.sendMessage(chatId, formattedMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '👍', callback_data: 'vote_up' }, { text: '👎', callback_data: 'vote_down' }]] }
      });
    } catch (error) {
      bot.sendMessage(chatId, `"${historyData.quote}"\n— *${historyData.author}*`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const data = await getBotData();

    if (data.history.length === 0) return bot.sendMessage(chatId, "No history available yet.");

    const historyText = data.history.map((item, i) => {
      const text = typeof item === 'string' ? item : item.quote;
      return `${i + 1}. _${text}_`;
    }).join('\n\n');

    bot.sendMessage(chatId, `📜 **Last ${data.history.length} Maxim Dispatches:**\n\n${historyText}`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/schedule$/, async (msg) => {
    const chatId = msg.chat.id;
    let data = await getBotData();
    const sched = data.users[chatId]?.schedule || { morning: true, midday: false, evening: false, weekly: false };
    const text = `🗓️ **Your Schedule:**\n🌅 Morning: ${sched.morning ? "✅" : "❌"}\n☀️ Midday: ${sched.midday ? "✅" : "❌"}\n🌙 Evening: ${sched.evening ? "✅" : "❌"}\n📅 Weekly: ${sched.weekly ? "✅" : "❌"}\n\n*Toggle using /schedule <time>*`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/schedule (morning|midday|evening|weekly)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const period = match[1].toLowerCase();
    let data = await getBotData();
    data = initializeUser(data, chatId);

    data.users[chatId].schedule[period] = !data.users[chatId].schedule[period];
    await saveBotData(data);
    bot.sendMessage(chatId, `Schedule updated! **${period}** dispatch is now: ${data.users[chatId].schedule[period] ? "✅" : "❌"}`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    const data = await getBotData();
    const topUsers = Object.entries(data.users)
      .filter(([, user]) => user.streak > 0 && !user.archived)
      .sort(([, a], [, b]) => b.streak - a.streak).slice(0, 5);

    if (topUsers.length === 0) return bot.sendMessage(chatId, "No active streaks yet.");

    let leaderboardText = "🏆 **Global Streak Leaderboard** 🏆\n\n";
    topUsers.forEach(([id, user], index) => {
      leaderboardText += `${index === 0 ? "🥇" : "🏅"} **User ...${String(id).slice(-3)}**: ${user.streak} days _(${getBadgeTitle(user.streak)})_\n`;
    });
    bot.sendMessage(chatId, leaderboardText, { parse_mode: 'Markdown' });
  });
}