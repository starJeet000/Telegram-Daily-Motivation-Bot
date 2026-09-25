import 'dotenv/config';

export const config = {
  botToken: process.env.TELEGRAM_BOT_API_TOKEN,
  geminiApiKey: process.env.GEMINI_API_KEY,
  adminChatId: process.env.TELEGRAM_CHAT_ID,
  isTestMode: process.argv.includes('--test')
};

// Fail-safe validation
if (!config.botToken) console.warn("⚠️ Warning: TELEGRAM_BOT_API_TOKEN is missing in .env");
if (!config.geminiApiKey) console.warn("⚠️ Warning: GEMINI_API_KEY is missing in .env");
if (!config.adminChatId) console.warn("⚠️ Warning: TELEGRAM_CHAT_ID is missing in .env");