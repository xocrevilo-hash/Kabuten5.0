import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const agentKey = key.toLowerCase();
  
  try {
    const [agent] = await sql`
      SELECT 
        sa.*,
        ab.thesis,
        ab.drivers,
        ab.risks,
        ab.ratings,
        ab.updated_at as brief_updated_at
      FROM sector_agents sa
      LEFT JOIN agent_briefs ab ON sa.agent_key = ab.agent_key
      WHERE sa.agent_key = ${agentKey}
    `;
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const [thread] = await sql`
      SELECT thread_history FROM agent_threads WHERE agent_key = ${agentKey}
    `;

    const companies = await sql`
      SELECT ticker, name, sector, market_cap_usd, classification
      FROM companies 
      WHERE agent_key = ${agentKey}
      ORDER BY name ASC
    `;

    const recentFindings = await sql`
      SELECT * FROM action_log 
      WHERE agent_key = ${agentKey}
      ORDER BY swept_at DESC 
      LIMIT 50
    `;

    return NextResponse.json({
      ...agent,
      thread_history: thread?.thread_history || [],
      companies,
      recent_findings: recentFindings,
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}
