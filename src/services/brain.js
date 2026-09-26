import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getBotData, getFallbackQuote, getBotConfig } from '../data/dataManager.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(prompt, maxRetries = 2) {
  const delays = [30000, 120000];

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

// NEW: Added customTopic parameter
export async function getDailyMotivationWithTelemetry(chatId = null, scheduleType = "morning", customTopic = null) {
  const startTime = Date.now();
  const data = await getBotData();
  const botConfig = await getBotConfig();

  // Default values
  let userTone = "stoic";
  let userLanguage = "English";

  if (chatId && data.users[chatId] && data.users[chatId].preferences) {
    userTone = data.users[chatId].preferences.tone || userTone;
    userLanguage = data.users[chatId].preferences.language || userLanguage;
  }

  // 1. Persona Prompt Library
  const personas = {
    "stoic": "a Stoic philosopher (focusing on what you can control, emotional resilience, and unclouded logic)",
    "warrior": "a disciplined warrior (focusing on courage, taking action, overcoming fear, and relentless momentum)",
    "philosopher": "a deep philosopher (focusing on wisdom, the meaning of struggles, and long-term perspective)",
    "strategist": "a Machiavellian strategist (focusing on calculated moves, reading the board, and outsmarting adversity)",
    "mentor": "a supportive but demanding mentor (focusing on tough love, unlocking potential, and daily habits)"
  };

  // Fallback to raw user input if they typed a custom tone not in the library
  const detailedTone = personas[userTone.toLowerCase()] || `a ${userTone}`;

  // 2. Contextual Awareness Engine (Time, Day, Season)
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[now.getDay()];
  const month = now.getMonth();

  let season = "winter";
  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 10) season = "autumn";

  const timeContext = `It is a ${dayName} in ${season}. Weave a subtle, natural awareness of this timing into the advice (e.g., Monday momentum, Friday reflection, seasonal endurance) if appropriate.`;

  // 3. Dynamic Schedule Context
  let contextInstruction = "It should feel like advice for someone playing a high-stakes game where resilience, strategy, and personal power are the only currencies.";
  if (scheduleType === "midday") contextInstruction = "Focus on midday realignment, maintaining momentum, and overcoming afternoon friction.";
  if (scheduleType === "evening") contextInstruction = "Focus on evening reflection, auditing the day's actions, and mental recovery for tomorrow.";
  if (scheduleType === "weekly") contextInstruction = "Focus on macro-level strategy, week-ahead planning, and visionary big-picture thinking.";
  if (scheduleType === "on_demand") contextInstruction = "Provide an immediate injection of clarity and drive.";

  // 4. Custom Topic Override
  let topicInstruction = "The maxim must be universally applicable to the human condition without being limited to any specific niche.";
  if (customTopic) {
    topicInstruction = `CRITICAL FOCUS: The user specifically requested wisdom regarding "${customTopic}". Tailor the maxim directly to this theme while maintaining the persona's voice.`;
  }

  try {
    const prompt = `
Generate a single, powerful, quote-style maxim (under 20 words). 

Language: ${userLanguage}
Tone Palette: Act as ${detailedTone}.

Contextual Awareness: ${timeContext}

Instruction: For this generation, deliver razor-sharp wisdom. ${contextInstruction} ${topicInstruction}

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