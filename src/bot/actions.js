import { logFeedback } from '../data/dataManager.js';

export function registerActions(bot) {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const action = query.data; // 'vote_up' or 'vote_down'

    // Extract quote text safely from the formatted message
    const rawText = query.message.text || "";
    const quoteText = rawText.split('\n\n_')[1]?.replace(/_$/, '') || "Unknown Quote";

    if (action === 'vote_up' || action === 'vote_down') {
      const vote = action === 'vote_up' ? 'up' : 'down';

      // Reverse-engineer the A/B variant from the ID to match the brain.js logic
      const isVariantB = String(chatId).slice(-1) % 2 === 0;
      const variant = isVariantB ? 'B' : 'A';

      // Log it to feedback.json
      await logFeedback(chatId, quoteText, vote, variant);

      // Flash a quick notification on the user's screen
      const responseText = vote === 'up' ? 'Glad this resonated. 🔥' : 'Feedback noted. We will adjust. 🛠️';
      bot.answerCallbackQuery(query.id, { text: responseText });

      // Remove the voting buttons from the message to prevent spamming
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId })
        .catch(err => console.error("Failed to remove inline keyboard:", err.message));
    }
  });
}