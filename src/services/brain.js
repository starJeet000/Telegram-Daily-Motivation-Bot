import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getBotData, getFallbackQuote } from '../data/dataManager.js';

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
      console.error(`[Attempt ${attempt + 1}] Brain API Error: ${error.name} - ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`Waiting ${delays[attempt] / 1000}s before retrying...`);
        await delay(delays[attempt]);
      } else {
        throw error;
      }
    }
  }
}

export async function getDailyMotivationWithTelemetry(userId = null) {
  const startTime = Date.now();
  const data = await getBotData();

  // Default values
  let userTone = "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero";
  let userLanguage = "English";

  // Override with user preferences if available
  if (userId && data.users[userId] && data.users[userId].preferences) {
    userTone = data.users[userId].preferences.tone || userTone;
    userLanguage = data.users[userId].preferences.language || userLanguage;
  }

  try {
    const prompt = `
Generate a single, powerful, quote-style maxim (under 20 words). 

Language: ${userLanguage}
Tone Palette: Blend elements of a ${userTone}.

Instruction: For this generation, choose a unique subset of these tones to deliver razor-sharp wisdom. It should feel like advice for someone playing a high-stakes game where resilience, strategy, and personal power are the only currencies. The maxim must be universally applicable to the human condition—addressing ambition, adversity, or self-mastery—without being limited to any specific niche. 

Output ONLY the text. No preamble. No quotation marks.`;

    const quoteText = await generateWithRetry(prompt);
    const responseTime = Date.now() - startTime;

    return {
      quote: quoteText,
      source: "gemini",
      responseTimeMs: responseTime,
      success: true
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorType = error.name || "API_CRITICAL_FAILURE";
    const errorMsg = error.message || "Unknown execution error";

    console.error("Brain Critical Failure:", errorMsg);

    // Fetch dynamic fallback and construct the admin alert string to pass up the chain
    const randomQuote = await getFallbackQuote(userLanguage);
    const adminAlertMsg = `⚠️ **SYSTEM ALERT: BRAIN FAILURE**\n\n**Error:** ${errorType}\n**Details:** ${errorMsg}\n**Action:** Triggering fallback quote sequence.`;

    return {
      quote: randomQuote,
      source: "fallback",
      responseTimeMs: responseTime,
      success: false,
      errorType: errorType,
      errorMessage: errorMsg,
      adminAlert: adminAlertMsg
    };
  }
}