import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getBotData, getFallbackQuote, getBotConfig } from '../data/dataManager.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const quoteCache = new Map();
const CACHE_TTL = 1000 * 60 * 60;

async function generateWithRetry(prompt, maxRetries = 2, temp = 0.85) {
  const delays = [30000, 120000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          }
        ],
        generationConfig: {
          temperature: temp,
          maxOutputTokens: 50,
          topP: 0.95
        }
      });

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^["']|["']$/g, '').trim();

      if (!text || text.length < 5) {
        throw new Error("Model returned an empty or invalid string.");
      }

      return text;
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

export async function getDailyMotivationWithTelemetry(chatId = null, scheduleType = "morning", customTopic = null) {
  const startTime = Date.now();
  const data = await getBotData();
  const botConfig = await getBotConfig();

  let userTone = "stoic";
  let userLanguage = "English";

  if (chatId && data.users[chatId] && data.users[chatId].preferences) {
    userTone = data.users[chatId].preferences.tone || userTone;
    userLanguage = data.users[chatId].preferences.language || userLanguage;
  }

  // Expanded personas blending harsh discipline with deep, reflective wisdom
  const personas = {
    "stoic": "a Stoic master (focus on unclouded logic, emotional equilibrium, and radical acceptance)",
    "warrior": "a battle-tested commander (focus on unyielding grit, tactical execution, and overcoming friction)",
    "philosopher": "a contemplative sage (focus on profound meaning, psychological clarity, and inner peace)",
    "strategist": "a master planner (focus on long-term leverage, outsmarting adversity, and patience)",
    "mentor": "a balanced guide (blending compassionate empathy with uncompromising standards)"
  };

  const detailedTone = personas[userTone.toLowerCase()] || `a ${userTone}`;

  // DYNAMIC MODALITY ROLL: Randomly selects whether this specific generation is Hard/Intense vs Soft/Reflective
  const modalities = [
    { type: "HARD_CORE", style: "Uncompromising, aggressive, sharp, and intense." },
    { type: "DEEP_WISDOM", style: "Thoughtful, grounding, architectural, and eye-opening." },
    { type: "GENTLE_RECOVERY", style: "Calm, reassuring, restorative, and deeply empathetic." },
    { type: "STRATEGIC", style: "Cold, calculated, highly analytical, and clear-headed." }
  ];

  const selectedModality = modalities[Math.floor(Math.random() * modalities.length)];

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[now.getDay()];
  const month = now.getMonth();

  let season = "winter";
  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 10) season = "autumn";

  const timeContext = `It is a ${dayName} in${season}. Weave a subtle, natural awareness of this timing into the advice.`;

  let contextInstruction = "Provide advice for someone navigating high-stakes personal growth.";
  if (scheduleType === "midday") contextInstruction = "Focus on midday realignment, resetting mental bandwidth, and steady pacing.";
  if (scheduleType === "evening") contextInstruction = "Focus on evening decompression, releasing today's heavy burdens, and mental restoration.";
  if (scheduleType === "weekly") contextInstruction = "Focus on macro-level clarity, realignment of priorities, and sustainable vision.";
  if (scheduleType === "on_demand") contextInstruction = "Provide an immediate injection of precise, perfectly tuned perspective.";

  const isVariantB = chatId && (String(chatId).slice(-1) % 2 === 0);
  const abVariant = isVariantB ? 'B' : 'A';

  let abInstruction = "";
  if (abVariant === 'B') {
    abInstruction = "EXPERIMENTAL VARIANT B: Frame the advice through a striking, unexpected metaphor.";
  }

  const cacheKey = `${userLanguage}_${detailedTone}_${scheduleType}_${abVariant}`;

  try {
    const systemPrompt = `You are an elite, multi-faceted coaching AI. Generate a completely original, profound maxim.

STRICT CONSTRAINTS:
1. UNDER 20 WORDS. MUST BE A COMPLETE, STANDALONE SENTENCE.
2. NO clichés or generic self-help tropes. 
3. DELIVERY MODALITY: [${selectedModality.type}] ->${selectedModality.style}
4. Output ONLY the raw quote text. No preamble, no formatting, no labels.
5. Target Language: ${userLanguage}`;

    const userPrompt = `CURRENT CONTEXT:
- Persona Archetype: ${detailedTone}
- Timing Awareness: ${timeContext}
- Objective: ${contextInstruction}${customTopic ? `- CRITICAL FOCUS TOPIC: Tailor the wisdom directly to: "${customTopic}"` : ''}
${abInstruction ? `- A/B Rule: ${abInstruction}` : ''}

OUTPUT THE MAXIM:`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const dynamicTemp = (selectedModality.type === "GENTLE_RECOVERY" || selectedModality.type === "DEEP_WISDOM") ? 0.92 : 0.82;

    const quoteText = await generateWithRetry(fullPrompt, botConfig.maxRetries, dynamicTemp);
    const responseTime = Date.now() - startTime;

    quoteCache.set(cacheKey, { quote: quoteText, timestamp: Date.now() });

    return {
      quote: quoteText,
      source: "gemini_3_5_flash_lite",
      abVariant: abVariant,
      responseTimeMs: responseTime,
      success: true,
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorType = error.name || "API_CRITICAL_FAILURE";
    const errorMsg = error.message || "Unknown execution error";

    console.error("Brain Critical Failure:", errorMsg);

    const cachedData = quoteCache.get(cacheKey);
    const safeErrorMsg = errorMsg.replace(/[`_*[\]]/g, "'");

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Serving cached quote for ${cacheKey} to bypass API limits.`);
      return {
        quote: cachedData.quote,
        source: "memory_cache",
        abVariant: abVariant,
        responseTimeMs: responseTime,
        success: false,
        errorType: "RATE_LIMIT_CACHED",
        adminAlert: `⚠️ *API CACHE TRIGGERED*\n\n*Error:* ${errorType}\nServing cached quote for ${userLanguage} / ${scheduleType} / Variant ${abVariant}.`
      };
    }

    const randomQuote = botConfig.fallbackQuoteMode ? await getFallbackQuote(userLanguage) : "Systems temporarily offline. Maintain discipline.";
    const adminAlertMsg = `⚠️ *SYSTEM ALERT: BRAIN FAILURE*\n\n*Error:* ${errorType}\n*Details:* ${safeErrorMsg}\n*Action:* Triggering JSON fallback quote sequence.`;

    return {
      quote: randomQuote,
      source: "fallback",
      abVariant: abVariant,
      responseTimeMs: responseTime,
      success: false,
      errorType: errorType,
      errorMessage: errorMsg,
      adminAlert: adminAlertMsg,
    };
  }
}