import fs from 'fs/promises';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const QUOTES_FILE = path.join(DB_DIR, 'quotes.json');
const CONFIG_FILE = path.join(DB_DIR, 'config.json');

// --- SYSTEM CONFIGURATION ---
export async function getBotConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    const defaultConfig = {
      maxRetries: 2,
      enableAnalytics: true,
      fallbackQuoteMode: true
    };
    await saveBotConfig(defaultConfig);
    return defaultConfig;
  }
}

export async function saveBotConfig(configData) {
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 2));
}

// --- USER DATA MANAGEMENT ---
export async function getBotData() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { history: [], users: {} };
  }
}

export async function saveBotData(data) {
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

// CHANGED: We now map to chatId instead of userId to support group chats
export function initializeUser(data, chatId) {
  if (!data.users[chatId]) {
    data.users[chatId] = {
      streak: 0,
      subscribed: true,
      archived: false,
      lastActive: new Date().toISOString(),
      preferences: {
        tone: "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero",
        language: "English",
        timezone: "Asia/Kolkata",
        frequency: "daily"
      },
      schedule: {
        morning: true,
        midday: false,
        evening: false,
        weekly: false
      }
    };
  }

  // Migration: Apply schedule object to existing v1.4.0 users
  if (!data.users[chatId].schedule) {
    data.users[chatId].schedule = {
      morning: data.users[chatId].subscribed !== false,
      midday: false,
      evening: false,
      weekly: false
    };
  }
  return data;
}

// --- QUOTE MANAGEMENT & SMART ROTATION ---
let quotesCache = null; // Memory cache for the fallback JSON

export async function getFallbackQuote(preferredLanguage = "English") {
  try {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Lazy-load and initialize the 30-day tracking tags
    if (!quotesCache) {
      const data = await fs.readFile(QUOTES_FILE, 'utf-8');
      // Inject a lastUsed timestamp into every quote object in memory
      quotesCache = JSON.parse(data).map(q => ({ ...q, lastUsed: 0 }));
      console.log("Lazy-loaded quotes.json into memory for smart rotation.");
    }

    // 1. Primary Filter: Match language AND exclude quotes used in the last 30 days
    let availableQuotes = quotesCache.filter(q =>
      q.language &&
      q.language.toLowerCase() === preferredLanguage.toLowerCase() &&
      (now - q.lastUsed) > thirtyDaysMs
    );

    // 2. Failsafe A: If the 30-day rule exhausted the pool, drop the time restriction
    if (availableQuotes.length === 0) {
      console.log(`[Smart Rotation] Pool exhausted for ${preferredLanguage}. Resetting 30-day window.`);
      availableQuotes = quotesCache.filter(q =>
        q.language && q.language.toLowerCase() === preferredLanguage.toLowerCase()
      );
    }

    // 3. Failsafe B: If the language doesn't exist at all, default to English
    if (availableQuotes.length === 0) {
      availableQuotes = quotesCache.filter(q =>
        q.language && q.language.toLowerCase() === "english"
      );
    }

    // 4. Ultimate Failsafe
    if (availableQuotes.length === 0) availableQuotes = quotesCache;

    // Select a random quote from the heavily filtered pool
    const selectedQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];

    // 5. Update the memory cache timestamp to prevent repetition
    const cacheIndex = quotesCache.findIndex(q => q.text === selectedQuote.text);
    if (cacheIndex !== -1) {
      quotesCache[cacheIndex].lastUsed = now;
    }

    return `${selectedQuote.text} - ${selectedQuote.author}`;
  } catch (error) {
    console.error("Failed to load quotes.json:", error);
    return "Fortune Always Favours The Bold. - Unknown";
  }
}

// --- DATABASE MAINTENANCE ---
export async function archiveInactiveUsers() {
  const data = await getBotData();
  const now = new Date();
  let archivedCount = 0;

  for (const chatId in data.users) {
    const user = data.users[chatId];
    const lastActive = new Date(user.lastActive);

    const diffTime = Math.abs(now - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30 && !user.archived) {
      user.archived = true;
      archivedCount++;
    }
  }

  if (archivedCount > 0) {
    await saveBotData(data);
    console.log(`Database Cleanup: Archived ${archivedCount} inactive users/groups.`);
  }

  return archivedCount;
}

// --- FEEDBACK & A/B TESTING ---
const FEEDBACK_FILE = path.join(DB_DIR, 'feedback.json');

export async function logFeedback(chatId, quoteText, vote, variant) {
  await fs.mkdir(DB_DIR, { recursive: true });
  let feedback = [];

  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    feedback = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, start with empty array
  }

  feedback.push({
    timestamp: new Date().toISOString(),
    chatId,
    quoteText,
    vote, // 'up' or 'down'
    variant // 'A' or 'B'
  });

  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
}

export async function getFeedbackReport() {
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    const feedback = JSON.parse(data);

    const report = { total: feedback.length, A: { up: 0, down: 0 }, B: { up: 0, down: 0 } };

    feedback.forEach(entry => {
      const v = entry.variant || 'A';
      if (!report[v]) report[v] = { up: 0, down: 0 };
      if (entry.vote === 'up') report[v].up++;
      if (entry.vote === 'down') report[v].down++;
    });

    return report;
  } catch (error) {
    return { total: 0, A: { up: 0, down: 0 }, B: { up: 0, down: 0 } };
  }
}