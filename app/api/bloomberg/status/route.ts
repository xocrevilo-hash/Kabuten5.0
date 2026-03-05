import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const [lastSync] = await sql`
      SELECT MAX(updated_at) AS last_sync FROM bloomberg_data
    `;

    const [withData] = await sql`
      SELECT COUNT(*) AS count FROM bloomberg_data
    `;

    const [stale] = await sql`
      SELECT COUNT(*) AS count FROM bloomberg_data
      WHERE updated_at < NOW() - INTERVAL '48 hours'
    `;

    const [totalCoverage] = await sql`
      SELECT COUNT(*) AS count FROM companies
      WHERE bbg_ticker IS NOT NULL AND bbg_ticker != ''
    `;

    const totalWithData = Number(withData.count);
    const totalEligible = Number(totalCoverage.count);

    return NextResponse.json({
      last_sync:        lastSync.last_sync ?? null,
      total_with_data:  totalWithData,
      stale_count:      Number(stale.count),
      no_data_count:    Math.max(0, totalEligible - totalWithData),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch Bloomberg status', details: String(error) },
      { status: 500 }
    );
  }
}
