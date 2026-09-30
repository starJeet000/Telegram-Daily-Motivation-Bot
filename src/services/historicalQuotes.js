// src/services/historicalQuotes.js
import { getFallbackQuote } from '../data/dataManager.js';

// Provider 1: ZenQuotes API (Free, no auth required)
async function fetchZenQuotes() {
  const res = await fetch('https://zenquotes.io/api/random');
  if (!res.ok) throw new Error('ZenQuotes API down');

  const data = await res.json();
  return { quote: data[0].q, author: data[0].a, source: 'zenquotes' };
}

// Provider 2: Quotable API (Free, open-source quote database)
async function fetchQuotable() {
  const res = await fetch('https://api.quotable.io/random');
  if (!res.ok) throw new Error('Quotable API down');

  const data = await res.json();
  return { quote: data.content, author: data.author, source: 'quotable' };
}

// Provider 3: Web Scraper (Simulating BrainyQuote / Goodreads)
async function scrapeGoodreads() {
  // Using a specific tag to pull emotional/motivational content
  const res = await fetch('https://www.goodreads.com/quotes/tag/motivation', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (!res.ok) throw new Error('Goodreads blocked request');

  const html = await res.text();

  // Lightweight regex to isolate the first quote and author without pulling in Cheerio
  const quoteMatch = html.match(/&ldquo;(.*?)&rdquo;/);
  const authorMatch = html.match(/<span class="authorOrTitle">\s*(.*?)\s*<\/span>/);

  if (quoteMatch && authorMatch) {
    return {
      quote: quoteMatch[1].trim(),
      author: authorMatch[1].trim().replace(/,$/, ''),
      source: 'goodreads-scraper'
    };
  }
  throw new Error('Goodreads DOM changed, regex extraction failed');
}

/**
 * Fetches a random historical quote by shuffling available providers.
 * Guarantees a return value by falling back to local JSON if all fail.
 */
export async function getHistoricalQuote(userLanguage = 'English') {
  // 1. Array of our data strategies
  const providers = [fetchZenQuotes, fetchQuotable, scrapeGoodreads];

  // 2. Randomize the execution order so the bot isn't hammering one API exclusively
  providers.sort(() => Math.random() - 0.5);

  // 3. Attempt each provider in the shuffled order
  for (const provider of providers) {
    try {
      const result = await provider();
      return { ...result, success: true };
    } catch (error) {
      console.warn(`[Quote Fetcher] ${provider.name} failed: ${error.message}. Falling over to next...`);
      continue;
    }
  }

  // 4. If the entire array fails, execute local JSON fallback
  console.error('[Quote Fetcher] All external sources failed. Executing local JSON fallback.');

  // Fetching from your existing dataManager configuration
  const fallbackQuoteText = await getFallbackQuote(userLanguage);

  return {
    quote: fallbackQuoteText,
    author: "Local Archive",
    source: 'quotes.json',
    success: false
  };
}