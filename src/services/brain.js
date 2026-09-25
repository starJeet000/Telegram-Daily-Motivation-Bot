import { GoogleGenerativeAI } from '@google/generative-ai';[cite, 13]
import { config } from '../config/env.js';[cite, 13]
import { getBotData, getFallbackQuote, getBotConfig } from '../data/dataManager.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);[cite, 13]

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));[cite, 13]

async function generateWithRetry(prompt, maxRetries = 2) {
  [cite, 13]
  const delays = [30000, 120000]; // 30s, 2m in milliseconds[cite, 13]

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    [cite, 13]
    try {
      [cite, 13]
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });[cite, 13]
      const result = await model.generateContent(prompt);[cite, 13]
      return result.response.text().trim();[cite, 13]
    } catch (error) {
      [cite, 13]
      console.error(`[Attempt ${attempt + 1}] Brain API Error: ${error.name} -${error.message}`);[cite, 13]

      if (attempt < maxRetries) {
        [cite, 13]
        console.log(`Waiting ${delays[attempt] / 1000}s before retrying...`);[cite, 13]
        await delay(delays[attempt]);[cite, 13]
      } else {
        [cite, 13]
        throw error;[cite, 13]
      } [cite, 13]
    } [cite, 13]
  } [cite, 13]
} [cite, 13]

export async function getDailyMotivationWithTelemetry(userId = null) {
  [cite, 13]
  const startTime = Date.now();[cite, 13]
  const data = await getBotData();[cite, 13]
  const botConfig = await getBotConfig();

  // Default values[cite, 13]
  let userTone = "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero";[cite, 13]
  let userLanguage = "English";[cite, 13]

  // Override with user preferences if available[cite, 13]
  if (userId && data.users[userId] && data.users[userId].preferences) {
    [cite, 13]
    userTone = data.users[userId].preferences.tone || userTone;[cite, 13]
    userLanguage = data.users[userId].preferences.language || userLanguage;[cite, 13]
  } [cite, 13]

  try {
    [cite, 13]
    const prompt = `
Generate a single, powerful, quote-style maxim (under 20 words). 

Language: ${userLanguage}
Tone Palette: Blend elements of a ${userTone}.

Instruction: For this generation, choose a unique subset of these tones to deliver razor-sharp wisdom. It should feel like advice for someone playing a high-stakes game where resilience, strategy, and personal power are the only currencies. The maxim must be universally applicable to the human condition—addressing ambition, adversity, or self-mastery—without being limited to any specific niche. 

Output ONLY the text. No preamble. No quotation marks.`;[cite, 13]

    const quoteText = await generateWithRetry(prompt, botConfig.maxRetries);
    const responseTime = Date.now() - startTime;[cite, 13]

    return {
      quote: quoteText[cite, 13],
      source: "gemini"[cite, 13],
      responseTimeMs: responseTime[cite, 13],
      success: true[cite, 13],
    };[cite, 13]

  } catch (error) {
    [cite, 13]
    const responseTime = Date.now() - startTime;[cite, 13]
    const errorType = error.name || "API_CRITICAL_FAILURE";[cite, 13]
    const errorMsg = error.message || "Unknown execution error";[cite, 13]

    console.error("Brain Critical Failure:", errorMsg);[cite, 13]

    // Fetch dynamic fallback and construct the admin alert string to pass up the chain[cite, 13]
    const randomQuote = botConfig.fallbackQuoteMode ? await getFallbackQuote(userLanguage) : "Systems temporarily offline. Maintain discipline.";
    const adminAlertMsg = `⚠️ **SYSTEM ALERT: BRAIN FAILURE**\n\n**Error:** ${errorType}\n**Details:** ${errorMsg}\n**Action:** Triggering fallback quote sequence.`;[cite, 13]

    return {
      quote: randomQuote[cite, 13],
      source: "fallback"[cite, 13],
      responseTimeMs: responseTime[cite, 13],
      success: false[cite, 13],
      errorType: errorType[cite, 13],
      errorMessage: errorMsg[cite, 13],
      adminAlert: adminAlertMsg[cite, 13],
    };[cite, 13]
  } [cite, 13]
} [cite, 13]