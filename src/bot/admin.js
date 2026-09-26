import { config } from '../config/env.js';
import { getBotData, getBotConfig, saveBotConfig, getFeedbackReport } from '../data/dataManager.js';

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

    // Performance Optimization: Batching
    const BATCH_SIZE = 25;
    const BATCH_DELAY = 1500; // 1.5 seconds between batches
    let successCount = 0;

    bot.sendMessage(msg.chat.id, `🚀 Starting broadcast to ${activeUsers.length} users in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async ([id, _user]) => {
        try {
          await bot.sendMessage(id, `📢 **Admin Broadcast:**\n\n${broadcastMsg}`, { parse_mode: 'Markdown' });
          successCount++;
        } catch (err) {
          console.error(`Failed to broadcast to ${id}:`, err.message);
        }
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < activeUsers.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    bot.sendMessage(msg.chat.id, `✅ Broadcast complete! Successfully dispatched to ${successCount}/${activeUsers.length} active users.`);
  });

  // COMMAND: /webhook
  bot.onText(/\/webhook/, (msg) => {
    if (!isAdmin(msg)) return;

    const webhookText = `
🔌 **API & Webhook Integrations**

**Public Feed (GET):**
Returns the last 7 generated quotes.
\`curl http://localhost:${config.port}/api/quotes/latest\`

**Broadcast Webhook (POST):**
Push external alerts directly to all active subscribers.
\`\`\`bash
curl -X POST http://localhost:${config.port}/api/webhook/broadcast \\
-H "x-api-key: ${config.webhookSecret}" \\
-H "Content-Type: application/json" \\
-d '{"message": "Testing external IFTTT hook!"}'
\`\`\`
    `;

    bot.sendMessage(msg.chat.id, webhookText, { parse_mode: 'Markdown' });
  });

  // COMMAND: /admin_report
  bot.onText(/\/admin_report/, async (msg) => {
    if (!isAdmin(msg)) return;

    const report = await getFeedbackReport();

    // Calculate win rates
    const totalA = report.A.up + report.A.down;
    const totalB = report.B.up + report.B.down;
    const winRateA = totalA > 0 ? ((report.A.up / totalA) * 100).toFixed(1) : 0;
    const winRateB = totalB > 0 ? ((report.B.up / totalB) * 100).toFixed(1) : 0;

    const reportText = `
📈 **A/B Testing & Feedback Report**
*Total Votes Cast: ${report.total}*

**Variant A (Standard Persona)**
👍 Upvotes: ${report.A.up}
👎 Downvotes: ${report.A.down}
🏆 Approval Rate: ${winRateA}%

**Variant B (Intense & Urgent)**
👍 Upvotes: ${report.B.up}
👎 Downvotes: ${report.B.down}
🏆 Approval Rate: ${winRateB}%
    `;

    bot.sendMessage(msg.chat.id, reportText, { parse_mode: 'Markdown' });
  });
}