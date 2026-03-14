import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Adds ceo_name column (CEO name for headline display)
// Run once: GET /api/bloomberg/migrate-v5
export async function GET() {
  try {
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS ceo_name TEXT`;

    const count = await sql`SELECT COUNT(*) AS count FROM bloomberg_data`;
    return NextResponse.json({
      success: true,
      message: 'ceo_name column added to bloomberg_data',
      bloomberg_rows: Number(count[0].count),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
