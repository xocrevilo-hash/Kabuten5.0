import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/bloomberg/valuation-history?ticker=NVDA&limit=52
// Returns weekly valuation snapshots for the given ticker (newest first)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '104'), 260); // max 5Y

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  }

  const rows = await sql`
    SELECT snapshot_date, fwd_pe, ev_ebitda, px_last, market_cap
    FROM valuation_history
    WHERE ticker = ${ticker}
    ORDER BY snapshot_date ASC
    LIMIT ${limit}
  `;

  return NextResponse.json(rows);
}
