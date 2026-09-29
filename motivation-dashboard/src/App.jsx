import { useState, useEffect } from 'react';

export default function App() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuotes = async () => {
    try {
      const BACKEND_URL = 'https://telegram-daily-motivation-bot.onrender.com/';
      const response = await fetch(`${BACKEND_URL}/api/quotes/latest`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const rawData = await response.json();

      // Robust extraction: Digs out the quotes whether Express sends an array, a { data: [] } wrapper, or a cached Dictionary object
      let parsedData = [];
      if (Array.isArray(rawData)) parsedData = rawData;
      else if (rawData.data && Array.isArray(rawData.data)) parsedData = rawData.data;
      else if (rawData.quotes && Array.isArray(rawData.quotes)) parsedData = rawData.quotes;
      else if (typeof rawData === 'object' && rawData !== null) parsedData = Object.values(rawData);

      // Sort to show newest first if timestamp exists
      const sorted = parsedData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setQuotes(sorted);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000); // Polling every 15s for live Telegram updates
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Global CSS Reset & Scrollbar Styling */}
      <style>{`
        body, html { margin: 0; padding: 0; background: #0f172a; min-height: 100vh; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: '#f8fafc',
        padding: '4rem 1.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h1 style={{
              margin: '0 0 1rem 0',
              fontSize: '3.5rem',
              background: 'linear-gradient(to right, #38bdf8, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '800',
              letterSpacing: '-1px'
            }}>
              Daily Qoutation Telemetry
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.125rem', fontWeight: '500' }}>
              Live Backend Feed • AI Dispatch Analytics
            </p>
          </header>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#60a5fa' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '1rem' }}>Synchronizing with Express API...</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ color: '#fca5a5', fontWeight: 'bold', margin: 0 }}>⚠️ Connection Error: {error}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {quotes.map((item, index) => (
              <div key={index} style={{
                padding: '2rem',
                background: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderLeft: '4px solid #818cf8',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.2s ease'
              }}>
                <h2 style={{
                  fontSize: '1.35rem',
                  marginTop: 0,
                  fontWeight: '500',
                  color: '#f1f5f9',
                  lineHeight: '1.6',
                  letterSpacing: '0.2px'
                }}>
                  "{item.quote || item.text || item.message || 'Data format unrecognized'}"
                </h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.875rem', marginTop: '1.5rem', fontWeight: '500' }}>
                  <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#7dd3fc', padding: '0.35rem 1rem', borderRadius: '999px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    🤖 {item.source || item.engine || 'Fallback Memory'}
                  </span>

                  {item.abVariant && (
                    <span style={{ background: 'rgba(192, 132, 252, 0.1)', color: '#e879f9', padding: '0.35rem 1rem', borderRadius: '999px', border: '1px solid rgba(192, 132, 252, 0.2)' }}>
                      🧪 Variant {item.abVariant}
                    </span>
                  )}

                  {item.responseTimeMs && (
                    <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#6ee7b7', padding: '0.35rem 1rem', borderRadius: '999px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                      ⚡ {item.responseTimeMs}ms
                    </span>
                  )}
                </div>
              </div>
            ))}

            {!loading && quotes.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px dashed #475569' }}>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: 0 }}>Awaiting initial broadcast data from the backend...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}