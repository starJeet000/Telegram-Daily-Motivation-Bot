import { getFallbackQuote } from '../data/dataManager.js';

const recentQuotesCache = new Set();

function cleanQuoteString(str) {
  if (!str) return '';
  return str.replace(/^["'“`]+|["'”`]+$/g, '').trim();
}

async function fetchZenQuotes() {
  const startTime = Date.now();
  const res = await fetch('https://zenquotes.io/api/random');
  if (!res.ok) throw new Error('ZenQuotes API down');

  const data = await res.json();
  const rawQuote = cleanQuoteString(data[0].q);
  const author = data[0].a || 'Unknown';

  return {
    quote: rawQuote,
    author,
    source: 'zenquotes',
    responseTimeMs: Date.now() - startTime
  };
}

async function fetchQuotable() {
  const startTime = Date.now();
  const res = await fetch('https://api.quotable.io/random');
  if (!res.ok) throw new Error('Quotable API down');

  const data = await res.json();
  const rawQuote = cleanQuoteString(data.content);

  return {
    quote: rawQuote,
    author: data.author || 'Unknown',
    source: 'quotable',
    responseTimeMs: Date.now() - startTime
  };
}

async function scrapeGoodreads() {
  const startTime = Date.now();
  // Randomize tag page to prevent getting the same top quote every time
  const page = Math.floor(Math.random() * 5) + 1;
  const res = await fetch(`https://www.goodreads.com/quotes/tag/motivation?page=${page}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (!res.ok) throw new Error('Goodreads blocked request');

  const html = await res.text();

  // Extract all quotes from the page
  const quoteMatches = [...html.matchAll(/&ldquo;(.*?)&rdquo;/g)];
  const authorMatches = [...html.matchAll(/<span class="authorOrTitle">\s*(.*?)\s*<\/span>/g)];

  if (quoteMatches.length > 0 && authorMatches.length > 0) {
    // Pick a random index from matched items on page
    const randomIndex = Math.floor(Math.random() * Math.min(quoteMatches.length, authorMatches.length));
    const quote = cleanQuoteString(quoteMatches[randomIndex][1]);
    const author = authorMatches[randomIndex][1].trim().replace(/,$/, '');

    return {
      quote,
      author,
      source: 'goodreads-scraper',
      responseTimeMs: Date.now() - startTime
    };
  }
  throw new Error('Goodreads extraction failed');
}

export async function getHistoricalQuote(userLanguage = 'English') {
  const providers = [fetchZenQuotes, fetchQuotable, scrapeGoodreads];
  providers.sort(() => Math.random() - 0.5);

  for (const provider of providers) {
    try {
      const result = await provider();

      // Prevent consecutive duplicate quotes
      if (recentQuotesCache.has(result.quote)) {
        continue;
      }

      recentQuotesCache.add(result.quote);
      if (recentQuotesCache.size > 15) {
        const first = recentQuotesCache.values().next().value;
        recentQuotesCache.delete(first);
      }

      return { ...result, success: true };
    } catch (error) {
      console.warn(`[Quote Fetcher] ${provider.name} failed: ${error.message}`);
    }
  }

  // Fallback to local quotes.json
  const fallbackQuoteText = await getFallbackQuote(userLanguage);
  return {
    quote: cleanQuoteString(fallbackQuoteText),
    author: "Historical Archive",
    source: 'quotes.json',
    responseTimeMs: 5,
    success: false
  };
}