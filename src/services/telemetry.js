import fs from 'fs/promises';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'database');

function getLogFileName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return path.join(DB_DIR, `logs-${year}-${month}.json`);
}

export async function logAnalytics(eventData) {
  const fileName = getLogFileName();
  let logs = [];

  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    const data = await fs.readFile(fileName, 'utf-8');
    logs = JSON.parse(data);
  } catch (error) {
    // Start fresh if file doesn't exist yet
  }

  logs.push({
    timestamp: new Date().toISOString(),
    ...eventData
  });

  await fs.writeFile(fileName, JSON.stringify(logs, null, 2));
}