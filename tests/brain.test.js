import { jest } from '@jest/globals';

// 1. Define mock implementations first
const mockGenerateContent = jest.fn();

// 2. Register all mocks BEFORE importing the module we want to test
jest.unstable_mockModule('../src/data/dataManager.js', () => ({
  getBotData: jest.fn(async () => ({ users: {} })),
  // We force maxRetries to 0 so the test doesn't trigger your 30s delay timer
  getBotConfig: jest.fn(async () => ({ maxRetries: 0, fallbackQuoteMode: true })),
  getFallbackQuote: jest.fn(async () => "Mocked Fallback Quote - Test Author")
}));

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent
    })
  }))
}));

// 3. Dynamically import the service AFTER mocks are securely in place
const { getDailyMotivationWithTelemetry } = await import('../src/services/brain.js');

describe('Brain Service - AI Generation', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return an AI quote on successful Gemini API call', async () => {
    // Force the mock API to succeed instantly
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "Mocked AI Wisdom." }
    });

    const result = await getDailyMotivationWithTelemetry();

    expect(result.success).toBe(true);
    expect(result.source).toBe('gemini');
    expect(result.quote).toBe('Mocked AI Wisdom.');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('should trigger fallback system and admin alert on Gemini API failure', async () => {
    // Force the mock API to throw an error instantly
    mockGenerateContent.mockRejectedValueOnce(new Error("API Rate Limit Exceeded"));

    const result = await getDailyMotivationWithTelemetry();

    expect(result.success).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.quote).toBe('Mocked Fallback Quote - Test Author');
    expect(result.errorType).toBe('Error');
    expect(result.errorMessage).toBe('API Rate Limit Exceeded');
    expect(result.adminAlert).toContain('SYSTEM ALERT: BRAIN FAILURE');
  });
});