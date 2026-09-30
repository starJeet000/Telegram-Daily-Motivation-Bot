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
            maxOutputTokens: 60,
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
          break;
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

  let userTone = "mix"; // Default to mix for the broadest human experience
  let userLanguage = "English";

  if (chatId && data.users[chatId] && data.users[chatId].preferences) {
    userTone = data.users[chatId].preferences.tone || userTone;
    userLanguage = data.users[chatId].preferences.language || userLanguage;
  }

  // Expanded library covering all aspects of human existence
  const personas = {
    "stoic": "a Stoic master (focus on unclouded logic, emotional equilibrium, and radical acceptance)",
    "warrior": "a battle-tested commander (focus on unyielding grit, tactical execution, and overcoming friction)",
    "philosopher": "a contemplative sage (focus on profound meaning, psychological clarity, and inner peace)",
    "strategist": "a master planner (focus on long-term leverage, outsmarting adversity, and patience)",
    "mentor": "a balanced guide (blending compassionate empathy with uncompromising standards)",
    "elder": "a seasoned elder who has seen the full human lifecycle (focus on aging, legacy, the passage of time, and profound patience)",
    "survivor": "someone who has walked through the darkest valleys (focus on trauma, survival, acknowledging the bad, and finding the light)",
    "observer": "a quiet watcher of nature and animals (focus on brutal and beautiful lessons from the environment, natural instincts, and silent growth)",
    "wanderer": "a traveler who has met countless people (focus on human connections, shared grief, brief joys, and diverse perspectives)"
  };

  // The "Mix" Logic: If the user selects 'mix', pull a random persona from the full spectrum
  let selectedPersonaKey = userTone.toLowerCase();
  if (selectedPersonaKey === "mix" || selectedPersonaKey === "random" || !personas[selectedPersonaKey]) {
    const keys = Object.keys(personas);
    selectedPersonaKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const detailedTone = personas[selectedPersonaKey];

  const modalities = [
    { type: "RAW_REALITY", style: "Blunt, grounded, speaking from gritty human survival and friction." },
    { type: "DEEP_OBSERVATION", style: "Reflective, plain-spoken, observing the quiet truths of human nature." },
    { type: "QUIET_COMPASSION", style: "Deeply empathetic, understanding silent struggles and grief without pity." },
    { type: "PRAGMATIC", style: "No-nonsense, highly practical, focusing strictly on what works in the real world." }
  ];

  const selectedModality = modalities[Math.floor(Math.random() * modalities.length)];

  // Removed the rigid day/time injection to stop it from saying "Wednesday"
  let contextInstruction = "Speak to the raw, unspoken reality of just getting through the day.";
  if (scheduleType === "midday") contextInstruction = "Focus on the friction of the afternoon slump, the urge to quit, and the necessity of keeping going.";
  if (scheduleType === "evening") contextInstruction = "Focus on the physical exhaustion of the evening, washing off the day's dirt, and quiet acceptance.";
  if (scheduleType === "weekly") contextInstruction = "Reflect on the silent passage of time and stepping back to look at the larger machinery of life.";
  if (scheduleType === "on_demand") contextInstruction = "Deliver a sharp, grounding truth that cuts through the noise and forces the listener to face reality.";

  const isVariantB = chatId && (String(chatId).slice(-1) % 2 === 0);
  const abVariant = isVariantB ? 'B' : 'A';

  let abInstruction = "";
  if (abVariant === 'B') {
    // Removed the "stray dog" example. We now force it to invent its own mundane detail.
    abInstruction = "EXPERIMENTAL VARIANT B: Anchor the advice in ONE hyper-specific, gritty, mundane visual detail from everyday human life. DO NOT mention animals, dogs, weather, or seasons.";
  }

  const cacheKey = `${userLanguage}_${detailedTone}_${scheduleType}_${abVariant}`;

  try {
    const systemPrompt = `You are a deeply observant human who has lived through the full spectrum of existence—the light and the dark, the profound good and the devastating bad. You draw wisdom from every phase of the human lifecycle, the strangers you've met, and the raw environment around you.

STRICT CONSTRAINTS:
1. UNDER 25 WORDS. MUST BE A COMPLETE, STANDALONE SENTENCE.
2. ZERO AI CLICHÉS. Do not use words like "unmoor", "tapestry", "orchestrate", "realm", "delve", "navigate", or "symphony".
3. SPEAK FROM LIVED EXPERIENCE. Make it gritty, real, and observable. Avoid poetic fluff; speak like someone who has actually worked a long shift, felt tired, and watched the world quietly spin.
4. DELIVERY MODALITY: [${selectedModality.type}] -> ${selectedModality.style}
5. Output ONLY the raw quote text. No preamble, no formatting, no labels.
6. Target Language: ${userLanguage}`;

    const userPrompt = `CURRENT CONTEXT:
- Persona Archetype: ${detailedTone}
- Objective: ${contextInstruction}
${customTopic ? `- CRITICAL FOCUS TOPIC: Speak directly to the human reality of: "${customTopic}"` : ''}
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