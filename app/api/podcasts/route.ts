import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      CREATE TABLE IF NOT EXISTS podcast_summaries (
        id SERIAL PRIMARY KEY,
        podcast_name TEXT NOT NULL,
        episode_title TEXT NOT NULL,
        episode_date DATE,
        bullets TEXT[] NOT NULL DEFAULT '{}',
        tickers TEXT[],
        source_url TEXT,
        has_relevant_content BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        scanned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(podcast_name, episode_title)
      )
    `;
    const rows = await sql`
      SELECT * FROM podcast_summaries
      WHERE has_relevant_content = true
      ORDER BY episode_date DESC
    `;
    return NextResponse.json({ summaries: rows });
  } catch (err) {
    console.error('[podcasts GET] error:', err);
    return NextResponse.json({ summaries: [] });
  }
}
