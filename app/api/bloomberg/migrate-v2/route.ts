import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Safe migration — adds expanded columns to bloomberg_data and creates
// valuation_history table. No data is dropped or modified.
// Run once: GET /api/bloomberg/migrate-v2
export async function GET() {
  try {
    // ── 1. Add expanded columns to bloomberg_data ────────────────
    // Earnings actuals
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS actual_eps_last  NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS actual_rev_last  NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS eps_surprise_pct NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS rev_surprise_pct NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS last_report_date  DATE`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS guidance_eps_hi  NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS guidance_eps_lo  NUMERIC`;

    // EPS revision momentum
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS eps_rev_1m   NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS eps_rev_3m   NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS rev_rev_1m   NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS rev_rev_3m   NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS est_up_1m    INTEGER`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS est_down_1m  INTEGER`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS best_eps_ntm NUMERIC`;

    // ── 2. Create valuation_history table ────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS valuation_history (
        id            SERIAL PRIMARY KEY,
        ticker        TEXT NOT NULL,
        snapshot_date DATE NOT NULL,
        fwd_pe        NUMERIC,
        ev_ebitda     NUMERIC,
        px_last       NUMERIC,
        market_cap    NUMERIC,
        UNIQUE(ticker, snapshot_date)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_val_hist_ticker ON valuation_history(ticker)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_val_hist_date   ON valuation_history(snapshot_date DESC)`;

    // ── 3. Verify counts ─────────────────────────────────────────
    const bbgCount = await sql`SELECT COUNT(*) AS count FROM bloomberg_data`;
    const valCount = await sql`SELECT COUNT(*) AS count FROM valuation_history`;

    return NextResponse.json({
      success: true,
      message: 'bloomberg_data expanded + valuation_history table ready',
      new_columns: [
        'actual_eps_last', 'actual_rev_last', 'eps_surprise_pct', 'rev_surprise_pct',
        'last_report_date', 'guidance_eps_hi', 'guidance_eps_lo',
        'eps_rev_1m', 'eps_rev_3m', 'rev_rev_1m', 'rev_rev_3m',
        'est_up_1m', 'est_down_1m', 'best_eps_ntm',
      ],
      bloomberg_rows: Number(bbgCount[0].count),
      valuation_history_rows: Number(valCount[0].count),
    });
  } catch (error) {
    console.error('Migrate v2 error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
