import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  return cookies['kabuten-auth'] === 'true';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
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
        CONSTRAINT uq_podcast_episode UNIQUE (podcast_name, episode_title)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_podcast_summaries_date
        ON podcast_summaries(episode_date DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_podcast_summaries_name
        ON podcast_summaries(podcast_name)
    `;
    return NextResponse.json({
      success: true,
      message: 'podcast_summaries table created (or already existed)',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
