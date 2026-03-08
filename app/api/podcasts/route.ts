import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT * FROM podcast_summaries
    WHERE has_relevant_content = true
    ORDER BY episode_date DESC
  `;
  return NextResponse.json(rows);
}
