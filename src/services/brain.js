import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getBotData, getFallbackQuote, getBotConfig } from '../data/dataManager.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(prompt, maxRetries = 2) {
  const delays = [30000, 120000]; // 30s, 2m in milliseconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error(`[Attempt ${attempt + 1}] Brain API Error: ${error.name} -${error.message}`);

      if (attempt < maxRetries) {
        console.log(`Waiting ${delays[attempt] / 1000}s before retrying...`);
        await delay(delays[attempt]);
      } else {
        throw error;
      }
    }
  }
}

export async function getDailyMotivationWithTelemetry(chatId = null, scheduleType = "morning") {
  const startTime = Date.now();
  const data = await getBotData();
  const botConfig = await getBotConfig();

  // Default values
  let userTone = "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero";
  let userLanguage = "English";

  // Override with user preferences if available
  if (chatId && data.users[chatId] && data.users[chatId].preferences) {
    userTone = data.users[chatId].preferences.tone || userTone;
    userLanguage = data.users[chatId].preferences.language || userLanguage;
  }

  // Dynamic Schedule Context
  let contextInstruction = "It should feel like advice for someone playing a high-stakes game where resilience, strategy, and personal power are the only currencies.";
  if (scheduleType === "midday") contextInstruction = "Focus on midday realignment, maintaining momentum, and overcoming afternoon friction.";
  if (scheduleType === "evening") contextInstruction = "Focus on evening reflection, auditing the day's actions, and mental recovery for tomorrow.";
  if (scheduleType === "weekly") contextInstruction = "Focus on macro-level strategy, week-ahead planning, and visionary big-picture thinking.";

  try {
    const prompt = `
Generate a single, powerful, quote-style maxim (under 20 words). 

Language: ${userLanguage}
Tone Palette: Blend elements of a ${userTone}.

Instruction: For this generation, choose a unique subset of these tones to deliver razor-sharp wisdom. ${contextInstruction} The maxim must be universally applicable to the human condition without being limited to any specific niche. 

Output ONLY the text. No preamble. No quotation marks.`;

    const quoteText = await generateWithRetry(prompt, botConfig.maxRetries);
    const responseTime = Date.now() - startTime;

    return {
      quote: quoteText,
      source: "gemini",
      responseTimeMs: responseTime,
      success: true,
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorType = error.name || "API_CRITICAL_FAILURE";
    const errorMsg = error.message || "Unknown execution error";

    console.error("Brain Critical Failure:", errorMsg);

    const randomQuote = botConfig.fallbackQuoteMode ? await getFallbackQuote(userLanguage) : "Systems temporarily offline. Maintain discipline.";
    const adminAlertMsg = `⚠️ **SYSTEM ALERT: BRAIN FAILURE**\n\n**Error:** ${errorType}\n**Details:** ${errorMsg}\n**Action:** Triggering fallback quote sequence.`;

    return {
      quote: randomQuote,
      source: "fallback",
      responseTimeMs: responseTime,
      success: false,
      errorType: errorType,
      errorMessage: errorMsg,
      adminAlert: adminAlertMsg,
    };
  }
}