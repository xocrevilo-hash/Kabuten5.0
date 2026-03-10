import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const companies = await sql`
    SELECT
      c.*,
      sa.agent_name,
      ab.ratings,
      ab.ratings->>c.ticker AS rating,
      MAX(al.swept_at) AS last_sweep,
      bd.market_cap AS bloomberg_market_cap,
      bd.px_last AS bloomberg_price,
      bd.updated_at AS bloomberg_updated_at
    FROM companies c
    LEFT JOIN sector_agents sa ON c.agent_key = sa.agent_key
    LEFT JOIN agent_briefs ab ON c.agent_key = ab.agent_key
    LEFT JOIN action_log al ON c.ticker = al.company_ticker
    LEFT JOIN bloomberg_data bd ON c.ticker = bd.ticker
    GROUP BY c.id, sa.agent_name, ab.ratings, bd.market_cap, bd.px_last, bd.updated_at
    ORDER BY c.name ASC
  `;
  return NextResponse.json(companies);
}
