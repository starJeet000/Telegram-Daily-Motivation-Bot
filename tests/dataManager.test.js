import { getFallbackQuote } from '../src/data/dataManager.js';

describe('Data Manager - Fallback Quotes', () => {

  test('should return an English quote when preferredLanguage is English', async () => {
    const quote = await getFallbackQuote('English');
    expect(quote).toBeDefined();
    expect(typeof quote).toBe('string');
    expect(quote.length).toBeGreaterThan(10);
    expect(quote).toContain('-'); // Ensures author is appended
  });

  test('should return a Spanish quote when preferredLanguage is Spanish', async () => {
    const quote = await getFallbackQuote('Spanish');
    expect(quote).toBeDefined();
    // Checks against known Spanish quotes in the database
    const isSpanish = quote.includes('éxito') || quote.includes('ajedrez');
    expect(isSpanish).toBe(true);
  });

  test('should safely default to English if an unsupported language is requested', async () => {
    const quote = await getFallbackQuote('French');
    expect(quote).toBeDefined();
    // Since we don't have French, it should fall back to a valid string
    expect(typeof quote).toBe('string');
    expect(quote.length).toBeGreaterThan(10);
  });
});