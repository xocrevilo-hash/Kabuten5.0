import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Adds consensus High/Low and EBIT columns for full Consensus Change panel
// Run once: GET /api/bloomberg/migrate-v6
export async function GET() {
  try {
    // EPS FY1 high/low
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_eps_fy1_high NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_eps_fy1_low  NUMERIC`;
    // Revenue FY1 high/low + FY2 consensus
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_rev_fy1_high NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_rev_fy1_low  NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_rev_fy2      NUMERIC`;
    // EBIT FY1 consensus + high/low
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_ebit_fy1      NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_ebit_fy1_high NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS consensus_ebit_fy1_low  NUMERIC`;
    // Trading currency (for market cap display)
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS crncy TEXT`;

    const count = await sql`SELECT COUNT(*) AS count FROM bloomberg_data`;
    return NextResponse.json({
      success: true,
      message: 'bloomberg_data v6 columns added',
      new_columns: [
        'consensus_eps_fy1_high', 'consensus_eps_fy1_low',
        'consensus_rev_fy1_high', 'consensus_rev_fy1_low', 'consensus_rev_fy2',
        'consensus_ebit_fy1', 'consensus_ebit_fy1_high', 'consensus_ebit_fy1_low',
        'crncy',
      ],
      bloomberg_rows: Number(count[0].count),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
