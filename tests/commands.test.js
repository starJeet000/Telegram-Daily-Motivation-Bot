import { jest } from '@jest/globals';

// 1. Mock all external dependencies to prevent side effects
jest.unstable_mockModule('../src/data/dataManager.js', () => ({
  getBotData: jest.fn(async () => ({ history: [], users: {} })),
  initializeUser: jest.fn((data, id) => data),
  saveBotData: jest.fn(async () => { })
}));

jest.unstable_mockModule('../src/services/brain.js', () => ({
  getDailyMotivationWithTelemetry: jest.fn(async () => ({
    quote: "Integration Test Quote",
    source: "gemini",
    responseTimeMs: 150,
    success: true
  }))
}));

jest.unstable_mockModule('../src/services/telemetry.js', () => ({
  logAnalytics: jest.fn(async () => { })
}));

// We also need to mock the environment config so it doesn't try to alert the admin
jest.unstable_mockModule('../src/config/env.js', () => ({
  config: { adminChatId: '999999' }
}));

// 2. Import the router AFTER mocks are set
const { registerCommands } = await import('../src/bot/commands.js');

describe('Telegram Command Router Integration', () => {
  let mockBot;
  let handlers = {};

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};

    // 3. Create a fake Telegram bot to capture routes and spy on outputs
    mockBot = {
      onText: jest.fn((regex, handler) => {
        // Store the handler using the regex string as a key
        handlers[regex.toString()] = handler;
      }),
      sendMessage: jest.fn(async () => { })
    };

    // 4. Register the commands to our fake bot
    registerCommands(mockBot);
  });

  test('should successfully register all expected command routes', () => {
    expect(mockBot.onText).toHaveBeenCalled();

    const registeredRegexes = Object.keys(handlers);
    expect(registeredRegexes.some(r => r.includes('/motivate'))).toBe(true);
    expect(registeredRegexes.some(r => r.includes('/subscribe'))).toBe(true);
    expect(registeredRegexes.some(r => r.includes('/today'))).toBe(true);
  });

  test('should execute /help command and return the menu', async () => {
    // Find the specific handler mapped to /start or /help
    const helpRegex = Object.keys(handlers).find(r => r.includes('start|help'));
    const helpHandler = handlers[helpRegex];

    // Simulate a user sending the command
    const mockMsg = { chat: { id: 12345 } };
    await helpHandler(mockMsg);

    // Verify the bot responded correctly
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('Motivation Bot Commands:'),
      expect.any(Object)
    );
  });

  test('should execute /motivate command and trigger AI generation', async () => {
    const motivateRegex = Object.keys(handlers).find(r => r.includes('/motivate'));
    const motivateHandler = handlers[motivateRegex];

    const mockMsg = { chat: { id: 12345 } };
    await motivateHandler(mockMsg);

    // Verify it sends the loading message first
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('Channeling some inspiration...')
    );
  });
});