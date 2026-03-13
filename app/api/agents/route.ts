import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

function isMobileAuthorized(req: NextRequest): boolean {
  return req.headers.get('authorization') === 'Bearer fingerthumb';
}

export async function GET(req: NextRequest) {
  if (!isMobileAuthorized(req)) {
    const cookie = req.cookies.get('kabuten-auth');
    if (cookie?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
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
      ORDER BY sa.agent_name ASC
    `;
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
