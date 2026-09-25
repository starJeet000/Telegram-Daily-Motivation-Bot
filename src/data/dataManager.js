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
      subscribed: true, // Auto-subscribe upon first interaction
      archived: false,
      lastActive: new Date().toISOString(),
      preferences: {
        tone: "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero",
        language: "English",
        timezone: "Asia/Kolkata",
        frequency: "daily"
      }
    };
  }
  return data;
}

// --- QUOTE MANAGEMENT ---
export async function getFallbackQuote(preferredLanguage = "English") {
  try {
    const data = await fs.readFile(QUOTES_FILE, 'utf-8');
    const quotes = JSON.parse(data);

    let filteredQuotes = quotes.filter(q =>
      q.language && q.language.toLowerCase() === preferredLanguage.toLowerCase()
    );

    if (filteredQuotes.length === 0) {
      filteredQuotes = quotes.filter(q =>
        q.language && q.language.toLowerCase() === "english"
      );
    }

    if (filteredQuotes.length === 0) filteredQuotes = quotes;

    const random = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
    return `${random.text} - ${random.author}`;
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