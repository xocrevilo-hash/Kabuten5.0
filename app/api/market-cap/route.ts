import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS market_cap_cache (
        ticker     TEXT PRIMARY KEY,
        market_cap BIGINT,
        name       TEXT,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Check cache (24h)
    const cached = await sql`
      SELECT ticker, market_cap, name, fetched_at
      FROM market_cap_cache
      WHERE ticker = ${ticker}
        AND fetched_at > NOW() - INTERVAL '24 hours'
    `;

    if (cached.length > 0) {
      return NextResponse.json({
        ticker: cached[0].ticker,
        market_cap: cached[0].market_cap,
        name: cached[0].name,
        cached: true,
      });
    }

    // Fetch from financialdatasets.ai
    const url = `https://api.financialdatasets.ai/financial-metrics/snapshot/?ticker=${encodeURIComponent(ticker)}`;
    const headers: Record<string, string> = {};
    if (process.env.FINANCIAL_DATASETS_API_KEY) {
      headers['X-API-KEY'] = process.env.FINANCIAL_DATASETS_API_KEY;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      return NextResponse.json({ ticker, market_cap: null, cached: false });
    }

    const data = await res.json();
    const snapshot = data?.snapshot ?? data;
    const marketCap = snapshot?.market_cap ?? null;
    const name = snapshot?.company_name ?? snapshot?.name ?? null;

    if (marketCap) {
      await sql`
        INSERT INTO market_cap_cache (ticker, market_cap, name, fetched_at)
        VALUES (${ticker}, ${Math.round(marketCap)}, ${name}, NOW())
        ON CONFLICT (ticker) DO UPDATE SET
          market_cap = EXCLUDED.market_cap,
          name = EXCLUDED.name,
          fetched_at = NOW()
      `;
    }

    return NextResponse.json({
      ticker,
      market_cap: marketCap ? Math.round(marketCap) : null,
      name,
      cached: false,
    });
  } catch (err) {
    console.error('[market-cap] error:', err);
    return NextResponse.json({ ticker, market_cap: null, cached: false });
  }
}
