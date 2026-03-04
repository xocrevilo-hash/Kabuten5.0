import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// ~40 keywords covering company names, sector themes, macro topics
const HEATMAP_KEYWORDS = [
  // Semiconductor themes
  'HBM memory',
  'CoWoS packaging',
  'AI inference chips',
  'TSMC earnings',
  'Nvidia AI',
  'AMD datacenter',
  'Intel foundry',
  // Macro / policy
  'tariffs semiconductors',
  'CHIPS Act funding',
  'Japan chip subsidies',
  'Korea memory cycle',
  // Company names (major)
  'ASML lithography',
  'SK Hynix HBM',
  'Samsung memory',
  'Micron earnings',
  'Marvell AI',
  'Broadcom AI revenue',
  // APAC Tech
  'Taiwan semiconductor',
  'SoftBank AI',
  'Alibaba cloud',
  'Tencent gaming',
  'Sea Limited Shopee',
  'Grab super app',
  // EV / Auto
  'BYD EV sales',
  'Tesla China',
  'Panasonic battery',
  // Industrial / Robotics
  'Keyence automation',
  'Fanuc robot orders',
  'Mitsubishi Electric',
  // Healthcare / Biotech
  'GLP-1 obesity drug',
  'Daiichi Sankyo ADC',
  // Fintech / Payments
  'Adyen payments',
  'Block fintech',
  'PayPal earnings',
  // Cloud / Software
  'AWS re:Invent',
  'Azure AI OpenAI',
  'Google Cloud AI',
  // Energy / Materials
  'LNG Japan import',
  'copper demand AI',
  // Market sentiment
  'Japan equities rally',
  'APAC risk-off',
];

function computeHeatScore(currentViews: number, avgViews: number): number {
  if (avgViews === 0) return currentViews > 0 ? 50 : 0;
  const ratio = currentViews / avgViews;
  // ratio 0 → 0, ratio 1 → 50, ratio 3+ → 100
  const score = Math.min(100, Math.max(0, (ratio / 3) * 100));
  return Math.round(score * 10) / 10;
}

// This route is called from the browser when Chrome MCP is available.
// The frontend handles the actual X.com scraping via Chrome MCP;
// this route accepts the scraped data and writes it to the database.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { results } = body;
    // results: Array<{ keyword: string; view_count: number }>

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get 7-day averages for heat score calculation
    const avgs = await sql`
      SELECT keyword, AVG(view_count) as avg_views
      FROM heatmap_scans
      WHERE scanned_at > NOW() - INTERVAL '7 days'
      GROUP BY keyword
    `;
    const avgMap: Record<string, number> = {};
    for (const row of avgs) {
      avgMap[row.keyword] = parseFloat(row.avg_views) || 0;
    }

    // Insert scan results
    const insertValues = results.map((r: { keyword: string; view_count: number }) => {
      const avg = avgMap[r.keyword] || 0;
      const heat = computeHeatScore(r.view_count, avg);
      return { keyword: r.keyword, view_count: r.view_count, heat_score: heat };
    });

    for (const v of insertValues) {
      await sql`
        INSERT INTO heatmap_scans (keyword, view_count, heat_score)
        VALUES (${v.keyword}, ${v.view_count}, ${v.heat_score})
      `;
    }

    return NextResponse.json({
      ok: true,
      scanned: insertValues.length,
      results: insertValues,
    });
  } catch (err) {
    console.error('Heatmap scan error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

// Export keywords list for use by the frontend
export async function GET() {
  return NextResponse.json({ keywords: HEATMAP_KEYWORDS });
}
