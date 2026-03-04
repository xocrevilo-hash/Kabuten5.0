import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const summaries = await sql`
      SELECT id, podcast_name, episode_title, summary, companies_mentioned, published_at, created_at
      FROM podcast_summaries
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ summaries });
  } catch (err) {
    console.error('Podcasts GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { podcast_name, episode_title, summary, companies_mentioned, published_at } = body;

    await sql`
      INSERT INTO podcast_summaries (podcast_name, episode_title, summary, companies_mentioned, published_at)
      VALUES (${podcast_name}, ${episode_title}, ${summary}, ${JSON.stringify(companies_mentioned || [])}, ${published_at || null})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Podcasts POST error:', err);
    return NextResponse.json({ error: 'Failed to save podcast' }, { status: 500 });
  }
}
