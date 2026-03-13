import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// v3 requires instantiation
const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get('tickers') ?? '';
  if (!tickers) return NextResponse.json({ quotes: [] });

  const symbols = tickers.split(',').map(s => s.trim()).filter(Boolean);
  if (!symbols.length) return NextResponse.json({ quotes: [] });

  try {
    // yahoo-finance2 handles crumb/cookie automatically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await yf.quote(symbols);

    // Normalise: single result returns object, multiple returns array
    const arr: unknown[] = Array.isArray(raw) ? raw : [raw];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes = arr.map((q: any) => ({
      ticker:    q.symbol        ?? '',
      name:      q.shortName     ?? q.longName ?? q.symbol ?? '',
      price:     q.regularMarketPrice             ?? null,
      change:    q.regularMarketChange            ?? null,
      changePct: q.regularMarketChangePercent     ?? null,
      currency:  q.currency                       ?? 'USD',
      marketCap: q.marketCap                      ?? null,
      volume:    q.regularMarketVolume            ?? null,
      high52w:   q.fiftyTwoWeekHigh               ?? null,
      low52w:    q.fiftyTwoWeekLow                ?? null,
      prevClose: q.regularMarketPreviousClose     ?? null,
      marketState: q.marketState                  ?? 'CLOSED',
      timestamp: q.regularMarketTime ? new Date(q.regularMarketTime as string).getTime() : null,
    }));

    return NextResponse.json({ quotes, fetchedAt: Date.now() });
  } catch (err) {
    console.error('Yahoo Finance error:', err);
    return NextResponse.json({ quotes: [], error: String(err) }, { status: 500 });
  }
}
