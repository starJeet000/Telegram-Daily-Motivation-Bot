import fs from 'fs/promises';[cite, 14]
import path from 'path';[cite, 14]
import { config } from '../config/env.js';
import { getBotConfig, saveBotConfig } from '../data/dataManager.js';

// Safely resolve the database directory from the project root[cite, 14]
const DB_DIR = path.join(process.cwd(), 'database');[cite, 14]
const USERS_FILE = path.join(DB_DIR, 'users.json');[cite, 14]
const QUOTES_FILE = path.join(DB_DIR, 'quotes.json');[cite, 14]

// --- USER DATA MANAGEMENT ---[cite, 14]
export async function getBotData() {
  [cite, 14]
  try {
    [cite, 14]
    const data = await fs.readFile(USERS_FILE, 'utf-8');[cite, 14]
    return JSON.parse(data);[cite, 14]
  } catch (error) {
    [cite, 14]
    // Return default structure if file doesn't exist yet[cite, 14]
    return { history: [], users: {} };[cite, 14]
  } [cite, 14]
} [cite, 14]

export async function saveBotData(data) {
  [cite, 14]
  // Ensure the database directory exists before writing[cite, 14]
  await fs.mkdir(DB_DIR, { recursive: true });[cite, 14]
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));[cite, 14]
} [cite, 14]

export function initializeUser(data, userId) {
  [cite, 14]
  if (!data.users[userId]) {
    [cite, 14]
    data.users[userId] = {
      streak: 0[cite, 14],
      lastActive: new Date().toISOString()[cite, 14],
      preferences: {
        tone: "motivational mentor, stoic philosopher, disciplined warrior, a Machiavellian strategist, and a calculated anti-hero"[cite, 14],
        language: "English"[cite, 14],
        timezone: "Asia/Kolkata"[cite, 14],
        frequency: "daily"[cite, 14],
      }[cite, 14]
    };[cite, 14]
  } [cite, 14]
  return data;[cite, 14]
} [cite, 14]

// --- QUOTE MANAGEMENT ---[cite, 14]
export async function getFallbackQuote() {
  [cite, 14]
  try {
    [cite, 14]
    const data = await fs.readFile(QUOTES_FILE, 'utf-8');[cite, 14]
    const quotes = JSON.parse(data);[cite, 14]
    const random = quotes[Math.floor(Math.random() * quotes.length)];[cite, 14]

    return `${random.text} -${random.author}`;[cite, 14]
  } catch (error) {
    [cite, 14]
    console.error("Failed to load quotes.json:", error);[cite, 14]
    return "Fortune Always Favours The Bold. - Unknown"; // Ultimate failsafe[cite, 14]
  } [cite, 14]
} [cite, 14]

// --- DATABASE MAINTENANCE ---[cite, 14]
export async function archiveInactiveUsers() {
  [cite, 14]
  const data = await getBotData();[cite, 14]
  const now = new Date();[cite, 14]
  let archivedCount = 0;[cite, 14]

  for (const userId in data.users) {
    [cite, 14]
    const user = data.users[userId];[cite, 14]
    const lastActive = new Date(user.lastActive);[cite, 14]

    // Calculate difference in days[cite, 14]
    const diffTime = Math.abs(now - lastActive);[cite, 14]
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));[cite, 14]

    if (diffDays > 30 && !user.archived) {
      [cite, 14]
      user.archived = true;[cite, 14]
      archivedCount++;[cite, 14]
    } [cite, 14]
  } [cite, 14]

  if (archivedCount > 0) {
    [cite, 14]
    await saveBotData(data);[cite, 14]
    console.log(`Database Cleanup: Archived ${archivedCount} inactive users.`);[cite, 14]
  } [cite, 14]

  return archivedCount;[cite, 14]
} [cite, 14]

// --- ADMIN ROUTING ---
export function registerAdmin(bot) {
  const isAdmin = (msg) => String(msg.from.id) === String(config.adminChatId);

  // COMMAND: /config
  bot.onText(/\/config/, async (msg) => {
    if (!isAdmin(msg)) return;

    const botConfig = await getBotConfig();
    const configText = `⚙️ **Dynamic System Configuration:**\n\n\`\`\`json\n${JSON.stringify(botConfig, null, 2)}\n\`\`\`\n*Modify settings using:* \`/set_config <key> <value>\``;

    bot.sendMessage(msg.chat.id, configText, { parse_mode: 'Markdown' });
  });

  // COMMAND: /set_config <key> <value>
  bot.onText(/\/set_config (\w+) (.+)/, async (msg, match) => {
    if (!isAdmin(msg)) return;

    const key = match[1];
    let value = match[2];

    if (value.toLowerCase() === 'true') value = true;
    else if (value.toLowerCase() === 'false') value = false;
    else if (!isNaN(value)) value = Number(value);

    const botConfig = await getBotConfig();
    botConfig[key] = value;
    await saveBotConfig(botConfig);

    bot.sendMessage(msg.chat.id, `✅ **Configuration Updated:**\n\`${key}\` is now set to \`${value}\``, { parse_mode: 'Markdown' });
  });

  // COMMAND: /admin_stats
  bot.onText(/\/admin_stats/, async (msg) => {
    if (!isAdmin(msg)) return;

    const data = await getBotData();
    const totalUsers = Object.keys(data.users).length;
    const activeUsers = Object.values(data.users).filter(u => !u.archived).length;
    const archivedUsers = totalUsers - activeUsers;

    const statsText = `
📊 **System Overview:**
**Total Users:** ${totalUsers}
**Active Users:** ${activeUsers}
**Archived Users:** ${archivedUsers}
**Stored Quotes:** ${data.history.length}
        `;
    bot.sendMessage(msg.chat.id, statsText, { parse_mode: 'Markdown' });
  });

  // COMMAND: /admin_users
  bot.onText(/\/admin_users/, async (msg) => {
    if (!isAdmin(msg)) return;

    const data = await getBotData();
    let usersText = `👥 **Active User Roster:**\n\n`;

    for (const [id, user] of Object.entries(data.users)) {
      const status = user.archived ? "💤" : "🔥";
      usersText += `${status} ID: \`${id}\` | Streak: ${user.streak}\n`;
    }

    bot.sendMessage(msg.chat.id, usersText || "No users found in database.", { parse_mode: 'Markdown' });
  });

  // COMMAND: /admin_broadcast <message>
  bot.onText(/\/admin_broadcast (.+)/, async (msg, match) => {
    if (!isAdmin(msg)) return;

    const broadcastMsg = match[1];
    const data = await getBotData();
    const activeUsers = Object.entries(data.users).filter(([id, user]) => !user.archived);

    let successCount = 0;
    for (const [id, _user] of activeUsers) {
      try {
        await bot.sendMessage(id, `📢 **Admin Broadcast:**\n\n${broadcastMsg}`, { parse_mode: 'Markdown' });
        successCount++;
      } catch (err) {
        console.error(`Failed to broadcast to ${id}:`, err.message);
      }
    }

    bot.sendMessage(msg.chat.id, `✅ Broadcast successfully dispatched to ${successCount}/${activeUsers.length} active users.`);
  });
}