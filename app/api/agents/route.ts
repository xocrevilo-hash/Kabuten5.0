import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const agents = await sql`
      SELECT 
        sa.*,
        ab.thesis,
        ab.drivers,
        ab.risks,
        ab.ratings,
        ab.updated_at as brief_updated_at,
        bp.id as pending_proposal_id,
        bp.status as proposal_status
      FROM sector_agents sa
      LEFT JOIN agent_briefs ab ON sa.agent_key = ab.agent_key
      LEFT JOIN brief_proposals bp ON sa.agent_key = bp.agent_key AND bp.status = 'pending'
      ORDER BY sa.id ASC
    `;
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
