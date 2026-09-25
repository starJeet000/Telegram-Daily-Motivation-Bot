import fs from 'fs/promises';
import path from 'path';

// Safely resolve the database directory from the project root
const DB_DIR = path.join(process.cwd(), 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const QUOTES_FILE = path.join(DB_DIR, 'quotes.json');

// --- USER DATA MANAGEMENT ---
export async function getBotData() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default structure if file doesn't exist yet
    return { history: [], users: {} };
  }
}

export async function saveBotData(data) {
  // Ensure the database directory exists before writing
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

export function initializeUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      streak: 0,
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
export async function getFallbackQuote() {
  try {
    const data = await fs.readFile(QUOTES_FILE, 'utf-8');
    const quotes = JSON.parse(data);
    const random = quotes[Math.floor(Math.random() * quotes.length)];

    return `${random.text} - ${random.author}`;
  } catch (error) {
    console.error("Failed to load quotes.json:", error);
    return "Fortune Always Favours The Bold. - Unknown"; // Ultimate failsafe
  }
}