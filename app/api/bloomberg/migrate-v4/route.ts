import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Adds avg_volume column (average daily volume for ADTV calculation)
// Run once: GET /api/bloomberg/migrate-v4
export async function GET() {
  try {
    await sql`ALTER TABLE bloomberg_data ADD COLUMN IF NOT EXISTS avg_volume NUMERIC`;
    const count = await sql`SELECT COUNT(*) AS count FROM bloomberg_data`;
    return NextResponse.json({
      success: true,
      message: 'avg_volume column added to bloomberg_data',
      bloomberg_rows: Number(count[0].count),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
