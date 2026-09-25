import fs from 'fs/promises';
import path from 'path';

// Safely resolve the database directory from the project root
const DB_DIR = path.join(process.cwd(), 'database');[cite, 10]
const USERS_FILE = path.join(DB_DIR, 'users.json');[cite, 10]
const QUOTES_FILE = path.join(DB_DIR, 'quotes.json');[cite, 10]

// --- USER DATA MANAGEMENT ---
export async function getBotData() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');[cite, 10]
    return JSON.parse(data);[cite, 10]
  } catch (error) {
    // Return default structure if file doesn't exist yet
    return { history: [], users: {} };[cite, 10]
  }
}

export async function saveBotData(data) {
  // Ensure the database directory exists before writing
  await fs.mkdir(DB_DIR, { recursive: true });[cite, 10]
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));[cite, 10]
}

export function initializeUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      streak: 0[cite, 10],
      lastActive: new Date().toISOString()[cite, 10],
      preferences: {
        tone: "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero"[cite, 10],
        language: "English"[cite, 10],
        timezone: "Asia/Kolkata"[cite, 10],
        frequency: "daily"[cite, 10],
      }
    };[cite, 10]
  }
  return data;[cite, 10]
}

// --- QUOTE MANAGEMENT ---
export async function getFallbackQuote() {
  try {
    const data = await fs.readFile(QUOTES_FILE, 'utf-8');[cite, 10]
    const quotes = JSON.parse(data);[cite, 10]
    const random = quotes[Math.floor(Math.random() * quotes.length)];[cite, 10]

    return `${random.text} - ${random.author}`;[cite, 10]
  } catch (error) {
    console.error("Failed to load quotes.json:", error);[cite, 10]
    return "Fortune Always Favours The Bold. - Unknown"; // Ultimate failsafe[cite, 10]
  }
}

// --- DATABASE MAINTENANCE ---
export async function archiveInactiveUsers() {
  const data = await getBotData();
  const now = new Date();
  let archivedCount = 0;

  for (const userId in data.users) {
    const user = data.users[userId];
    const lastActive = new Date(user.lastActive);

    // Calculate difference in days
    const diffTime = Math.abs(now - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30 && !user.archived) {
      user.archived = true;
      archivedCount++;
    }
  }

  if (archivedCount > 0) {
    await saveBotData(data);
    console.log(`Database Cleanup: Archived ${archivedCount} inactive users.`);
  }

  return archivedCount;
}