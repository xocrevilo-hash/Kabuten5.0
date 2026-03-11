import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const ALL_KEYWORDS = [
  'NVDA','TSMC','ASML','AMD','Broadcom','HBM memory','CoWoS packaging',
  'AI inference','Blackwell GPU','hyperscaler capex','data center buildout',
  'semiconductor export controls','CHIPS Act','Tokyo Electron','Advantest',
  'Lasertec','Samsung HBM','SK Hynix HBM','Micron earnings','CATL battery',
  'BYD EV','Tesla demand','SoftBank Vision Fund','Alibaba earnings',
  'Tencent earnings','iron ore price','copper price','lithium price',
  'BOJ rate hike','JPY dollar','China stimulus','tariffs semiconductors',
  'US China tech war','PCB supply chain','power grid AI','transformer shortage',
  'networking optics','Marvell earnings','Arista Networks','Korea defence export',
];

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      CREATE TABLE IF NOT EXISTS heatmap_scans (
        id SERIAL PRIMARY KEY, keyword TEXT NOT NULL,
        heat_score NUMERIC(5,2), scanned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    const latest = await sql`
      SELECT DISTINCT ON (keyword) keyword, heat_score, scanned_at
      FROM heatmap_scans ORDER BY keyword, scanned_at DESC
    `;
    return NextResponse.json({
      scans: latest,
      keywords: ALL_KEYWORDS,
      lastScan: latest.length ? latest[0].scanned_at : null,
    });
  } catch {
    return NextResponse.json({ scans: [], keywords: ALL_KEYWORDS, lastScan: null });
  }
}
