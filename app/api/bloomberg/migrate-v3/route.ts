import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Safe migration — adds v3 columns to bloomberg_data
// Run once: GET /api/bloomberg/migrate-v3
export async function GET() {
  try {
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS px_to_book    NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS median_eps_fy1 NUMERIC`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS num_estimates  INTEGER`;
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS eps_std_dev    NUMERIC`;

    // Also add P/B to valuation_history for historical tracking
    await sql`ALTER TABLE valuation_history ADD COLUMN IF NOT EXISTS px_to_book NUMERIC`;

    const bbgCount = await sql`SELECT COUNT(*) AS count FROM bloomberg_data`;

    return NextResponse.json({
      success: true,
      message: 'bloomberg_data v3 columns ready',
      new_columns: ['px_to_book', 'median_eps_fy1', 'num_estimates', 'eps_std_dev'],
      bloomberg_rows: Number(bbgCount[0].count),
    });
  } catch (error) {
    console.error('Migrate v3 error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
