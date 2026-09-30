import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getBotData, getFallbackQuote, getBotConfig } from '../data/dataManager.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const quoteCache = new Map();
const CACHE_TTL = 1000 * 60 * 60;

// Ordered chain for LLM model endpoints to automatically handle deprecation/retirement
const MODEL_PRIORITY_CHAIN = [
  "gemini-3.5-flash-lite", // Primary high-throughput model
  "gemini-3.8-flash"       // Fallback model if 3.5-flash-lite is retired/deprecated
];

async function generateWithRetry(prompt, maxRetries = 2, temp = 0.85) {
  const delays = [30000, 120000];

  for (const modelName of MODEL_PRIORITY_CHAIN) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
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

        return { text, usedModel: modelName };
      } catch (error) {
        const isDeprecationOrNotFound =
          error.message.includes("404") ||
          error.message.includes("410") ||
          error.message.toLowerCase().includes("not found") ||
          error.message.toLowerCase().includes("deprecated");

        if (isDeprecationOrNotFound) {
          console.warn(`[Model Retirement Trigger] Model '${modelName}' is retired or unavailable. Failing over to next model in chain.`);
          break; // Failover immediately to next model in MODEL_PRIORITY_CHAIN
        }

        console.error(`[Attempt ${attempt + 1}] Brain API Error (${modelName}): ${error.name} -${error.message}`);
        if (attempt < maxRetries) {
          console.log(`Waiting ${delays[attempt] / 1000}s before retrying...`);
          await delay(delays[attempt]);
        }
      }
    }
  }

  throw new Error("All model endpoints in priority chain failed or are retired.");
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

  const personas = {
    "stoic": "a Stoic master (focus on unclouded logic, emotional equilibrium, and radical acceptance)",
    "warrior": "a battle-tested commander (focus on unyielding grit, tactical execution, and overcoming friction)",
    "philosopher": "a contemplative sage (focus on profound meaning, psychological clarity, and inner peace)",
    "strategist": "a master planner (focus on long-term leverage, outsmarting adversity, and patience)",
    "mentor": "a balanced guide (blending compassionate empathy with uncompromising standards)"
  };

  const detailedTone = personas[userTone.toLowerCase()] || `a ${userTone}`;

  const modalities = [
    { type: "RAW_REALITY", style: "Blunt, grounded, speaking from gritty human survival and friction." },
    { type: "DEEP_OBSERVATION", style: "Reflective, plain-spoken, observing the quiet truths of human nature." },
    { type: "QUIET_COMPASSION", style: "Deeply empathetic, understanding silent struggles and grief without pity." },
    { type: "PRAGMATIC", style: "No-nonsense, highly practical, focusing strictly on what works in the real world." }
  ];

  const selectedModality = modalities[Math.floor(Math.random() * modalities.length)];

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[now.getDay()];
  const timeContext = `Today is ${dayName}.`;

  let contextInstruction = "Provide advice for someone navigating the actual weight of daily life.";
  if (scheduleType === "midday") contextInstruction = "Focus on midday realignment, shaking off brain fog, and keeping promises to yourself.";
  if (scheduleType === "evening") contextInstruction = "Focus on the quiet of the evening, letting go of the day's mistakes, and finding peace.";
  if (scheduleType === "weekly") contextInstruction = "Focus on stepping back to look at the bigger picture of where their life is heading.";
  if (scheduleType === "on_demand") contextInstruction = "Provide an immediate, grounding truth to snap them back to reality.";

  const isVariantB = chatId && (String(chatId).slice(-1) % 2 === 0);
  const abVariant = isVariantB ? 'B' : 'A';

  let abInstruction = "";
  if (abVariant === 'B') {
    abInstruction = "EXPERIMENTAL VARIANT B: Frame the advice using a highly specific, everyday human observation (e.g., waiting in line, a burnt cup of coffee, tired eyes in a mirror).";
  }

  const cacheKey = `${userLanguage}_${detailedTone}_${scheduleType}_${abVariant}`;

  try {
    const systemPrompt = `You are a deeply observant human who has lived through the highest peaks and lowest valleys of life. You speak from profound, raw experience. You sound like a real person talking to a close friend.

STRICT CONSTRAINTS:
1. UNDER 25 WORDS. MUST BE A COMPLETE, STANDALONE SENTENCE.
2. ZERO AI CLICHÉS. Do not use words like "unmoor", "tapestry", "orchestrate", "realm", "delve", or "navigate".
3. NO NATURE METAPHORS. Stop talking about autumn, leaves, frost, or storms. Speak about actual human life, exhaustion, effort, and quiet perseverance.
4. DELIVERY MODALITY: [${selectedModality.type}] ->${selectedModality.style}
5. Output ONLY the raw quote text. No preamble, no formatting, no labels.
6. Target Language: ${userLanguage}`;

    const userPrompt = `CURRENT CONTEXT:
- Persona Archetype: ${detailedTone}
- Timing Awareness: ${timeContext}
- Objective: ${contextInstruction}${customTopic ? `- CRITICAL FOCUS TOPIC: Speak directly to the human reality of: "${customTopic}"` : ''}
${abInstruction ? `- A/B Rule: ${abInstruction}` : ''}

OUTPUT YOUR THOUGHT:`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const dynamicTemp = (selectedModality.type === "QUIET_COMPASSION" || selectedModality.type === "DEEP_OBSERVATION") ? 0.92 : 0.82;

    const { text: quoteText, usedModel } = await generateWithRetry(fullPrompt, botConfig.maxRetries, dynamicTemp);
    const responseTime = Date.now() - startTime;

    quoteCache.set(cacheKey, { quote: quoteText, timestamp: Date.now() });

    return {
      quote: quoteText,
      source: usedModel,
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