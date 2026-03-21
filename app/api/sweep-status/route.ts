export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

  // Get last swept_at per agent from action_log
  const rows = await sql`
    SELECT agent_key, MAX(swept_at) as last_swept
    FROM action_log
    GROUP BY agent_key
    ORDER BY agent_key
  `;

  const agents = rows.map(r => ({
    agent_key: r.agent_key,
    last_swept: r.last_swept,
    hours_ago: r.last_swept
      ? Math.round((Date.now() - new Date(r.last_swept).getTime()) / 36e5 * 10) / 10
      : null
  }));

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    agents,
    total: agents.length,
    swept_today: agents.filter(a => {
      if (!a.last_swept) return false;
      const today = new Date().toISOString().slice(0, 10);
      return a.last_swept.toString().startsWith(today);
    }).length
  });
}
