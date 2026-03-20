import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// One-shot migration: inserts CHIP agent + 3 companies without touching existing data.
// Call: GET /api/migrate/chip   (auth: x-cron-secret or Bearer fingerthumb)

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  const cronHeader = req.headers.get('x-cron-secret') ?? '';
  if (auth !== 'Bearer fingerthumb' && cronHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Agent
    await sql`
      INSERT INTO sector_agents (agent_key, agent_name, sector_name, colour)
      VALUES ('chip', 'CHIP', 'Taiwan Mid-Caps', 'cyan')
      ON CONFLICT (agent_key) DO NOTHING
    `;

    // 2. Companies
    const companies = [
      { name: 'MPI',                ticker: '6223.TW', bbg_ticker: '6223 TT Equity',  exchange: 'TWSE', country: 'TW', sector: 'Test & Measurement' },
      { name: 'Chroma ATE',         ticker: '2360.TW', bbg_ticker: '2360 TT Equity',  exchange: 'TWSE', country: 'TW', sector: 'Test & Measurement' },
      { name: 'Phison Electronics', ticker: '8299.TW', bbg_ticker: '8299 TT Equity',  exchange: 'TWSE', country: 'TW', sector: 'NAND Flash Controllers' },
    ];

    for (const c of companies) {
      await sql`
        INSERT INTO companies (name, ticker, bbg_ticker, exchange, country, sector, agent_key, classification)
        VALUES (${c.name}, ${c.ticker}, ${c.bbg_ticker}, ${c.exchange}, ${c.country}, ${c.sector}, 'chip', 'mid_cap')
        ON CONFLICT DO NOTHING
      `;
    }

    // 3. Brief (empty placeholder)
    await sql`
      INSERT INTO agent_briefs (agent_key)
      VALUES ('chip')
      ON CONFLICT DO NOTHING
    `;

    // 4. Thread
    await sql`
      INSERT INTO agent_threads (agent_key, thread_history)
      VALUES ('chip', '[]'::jsonb)
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ ok: true, message: 'CHIP agent seeded successfully' });
  } catch (err) {
    console.error('CHIP migration error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
