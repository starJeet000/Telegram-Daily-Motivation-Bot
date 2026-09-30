import fs from 'fs/promises';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const QUOTES_FILE = path.join(DB_DIR, 'quotes.json');
const CONFIG_FILE = path.join(DB_DIR, 'config.json');

// --- IN-MEMORY HISTORY BUFFER FOR EPHEMERAL ENVIRONMENTS ---
let memoryHistory = [];

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
    const parsed = JSON.parse(data);

    // Disk is the absolute source of truth if it exists
    if (!parsed.history) {
      parsed.history = memoryHistory;
    } else {
      memoryHistory = parsed.history;
    }

    return parsed;
  } catch (error) {
    // If Render wiped the ephemeral disk, fallback to memory buffer
    return { history: memoryHistory, users: {} };
  }
}

export async function saveBotData(data) {
  if (data.history) {
    memoryHistory = data.history;
  }
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    // Write atomically to prevent corruption during concurrent requests
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to persist user data to disk:", error);
  }
}

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

  // Migration: Apply schedule object to existing users
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
let quotesCache = null;

export async function getFallbackQuote(preferredLanguage = "English") {
  try {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (!quotesCache) {
      const data = await fs.readFile(QUOTES_FILE, 'utf-8');
      quotesCache = JSON.parse(data).map(q => ({ ...q, lastUsed: 0 }));
    }

    let availableQuotes = quotesCache.filter(q =>
      q.language &&
      q.language.toLowerCase() === preferredLanguage.toLowerCase() &&
      (now - q.lastUsed) > thirtyDaysMs
    );

    if (availableQuotes.length === 0) {
      availableQuotes = quotesCache.filter(q =>
        q.language && q.language.toLowerCase() === preferredLanguage.toLowerCase()
      );
    }

    if (availableQuotes.length === 0) {
      availableQuotes = quotesCache.filter(q =>
        q.language && q.language.toLowerCase() === "english"
      );
    }

    if (availableQuotes.length === 0) availableQuotes = quotesCache;

    const selectedQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];

    const cacheIndex = quotesCache.findIndex(q => q.text === selectedQuote.text);
    if (cacheIndex !== -1) {
      quotesCache[cacheIndex].lastUsed = now;
    }

    return `${selectedQuote.text} -${selectedQuote.author}`;
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
    const diffDays = Math.ceil(Math.abs(now - lastActive) / (1000 * 60 * 60 * 24));

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
  } catch (error) { }

  feedback.push({
    timestamp: new Date().toISOString(),
    chatId,
    quoteText,
    vote,
    variant
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