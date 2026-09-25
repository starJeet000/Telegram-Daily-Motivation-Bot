import { logAnalytics } from '../services/telemetry.js';

export function registerActions(bot) {
  bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;

    let responseText = '';
    if (action === 'vote_up') {
      responseText = "Glad this resonated with you! 🚀";
    } else if (action === 'vote_down') {
      responseText = "Noted. We'll recalibrate the focus for next time. 🛠️";
    }

    logAnalytics({
      event: "user_feedback",
      userId: userId,
      feedback: action
    }).catch(err => console.error("Failed to write log:", err));

    bot.answerCallbackQuery(callbackQuery.id);
    bot.sendMessage(chatId, responseText);
  });
}