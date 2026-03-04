import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    // Get the most recent scan time
    const latestRows = await sql`
      SELECT MAX(scanned_at) as latest_scan FROM heatmap_scans
    `;
    const latestScan = latestRows[0]?.latest_scan;

    if (!latestScan) {
      return NextResponse.json({ scans: [], lastScan: null });
    }

    // Get the latest scan data for each keyword
    const scans = await sql`
      SELECT DISTINCT ON (keyword)
        id, keyword, view_count, heat_score, scanned_at
      FROM heatmap_scans
      ORDER BY keyword, scanned_at DESC
    `;

    // Get 7-day rolling averages per keyword
    const avgs = await sql`
      SELECT
        keyword,
        AVG(view_count) as avg_views,
        COUNT(*) as scan_count
      FROM heatmap_scans
      WHERE scanned_at > NOW() - INTERVAL '7 days'
      GROUP BY keyword
    `;

    const avgMap: Record<string, { avg_views: number; scan_count: number }> = {};
    for (const row of avgs) {
      avgMap[row.keyword] = {
        avg_views: parseFloat(row.avg_views) || 0,
        scan_count: parseInt(row.scan_count) || 0,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (scans as any[]).map((s) => ({
      id: s.id,
      keyword: s.keyword,
      view_count: s.view_count,
      heat_score: parseFloat(String(s.heat_score)) || 0,
      scanned_at: s.scanned_at,
      avg_views: avgMap[s.keyword]?.avg_views || 0,
      scan_count: avgMap[s.keyword]?.scan_count || 0,
    }));

    return NextResponse.json({ scans: result, lastScan: latestScan });
  } catch (err) {
    console.error('Heatmap GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 });
  }
}
