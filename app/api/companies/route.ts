import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const companies = await sql`
    SELECT 
      c.*,
      sa.agent_name,
      ab.ratings,
      MAX(al.swept_at) AS last_sweep
    FROM companies c
    LEFT JOIN sector_agents sa ON c.agent_key = sa.agent_key
    LEFT JOIN agent_briefs ab ON c.agent_key = ab.agent_key
    LEFT JOIN action_log al ON c.ticker = al.company_ticker
    GROUP BY c.id, sa.agent_name, ab.ratings
    ORDER BY c.name ASC
  `;
  return NextResponse.json(companies);
}
