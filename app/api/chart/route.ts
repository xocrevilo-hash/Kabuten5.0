import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yf = new YahooFinance();

const PERIOD_CONFIG: Record<string, { days: number; interval: string }> = {
  '1W':  { days: 7,    interval: '1h' },
  '1M':  { days: 30,   interval: '1d' },
  '3M':  { days: 90,   interval: '1d' },
  '6M':  { days: 180,  interval: '1d' },
  '1Y':  { days: 365,  interval: '1d' },
  '2Y':  { days: 730,  interval: '1wk' },
  '3Y':  { days: 1095, interval: '1wk' },
  '5Y':  { days: 1825, interval: '1wk' },
};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') ?? '';
  const period  = req.nextUrl.searchParams.get('period')  ?? '1Y';

  if (!ticker) return NextResponse.json({ candles: [], error: 'No ticker' }, { status: 400 });

  const cfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG['1Y'];
  const period1 = new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000);
  const useTimestamp = cfg.interval === '1h';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.chart(ticker, {
      period1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interval: cfg.interval as any,
    });

    const quotes: unknown[] = result?.quotes ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candles = (quotes as any[])
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
      .map(q => {
        const d = new Date(q.date);
        return {
          time:   useTimestamp ? Math.floor(d.getTime() / 1000) : d.toISOString().slice(0, 10),
          open:   +q.open.toFixed(4),
          high:   +q.high.toFixed(4),
          low:    +q.low.toFixed(4),
          close:  +q.close.toFixed(4),
          volume: q.volume ?? 0,
        };
      });

    return NextResponse.json({
      candles,
      currency: result?.meta?.currency ?? 'USD',
      symbol:   result?.meta?.symbol   ?? ticker,
    });
  } catch (err) {
    console.error('Chart fetch error:', err);
    return NextResponse.json({ candles: [], error: String(err) }, { status: 500 });
  }
}
