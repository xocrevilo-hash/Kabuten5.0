import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const agentKey = key.toLowerCase();
  
  const [proposal] = await sql`
    SELECT * FROM brief_proposals 
    WHERE agent_key = ${agentKey} AND status = 'pending'
    ORDER BY proposed_at DESC LIMIT 1
  `;
  
  return NextResponse.json(proposal || null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const agentKey = key.toLowerCase();
  const body = await req.json();
  const { action, edits } = body; // action: 'accept' | 'reject', edits?: {...}

  if (action === 'accept') {
    const [proposal] = await sql`
      SELECT * FROM brief_proposals 
      WHERE agent_key = ${agentKey} AND status = 'pending'
      ORDER BY proposed_at DESC LIMIT 1
    `;
    
    if (!proposal) {
      return NextResponse.json({ error: 'No pending proposal' }, { status: 404 });
    }

    const thesis = edits?.thesis ?? proposal.proposed_thesis;
    const drivers = edits?.drivers ?? proposal.proposed_drivers;
    const risks = edits?.risks ?? proposal.proposed_risks;
    const ratings = edits?.ratings ?? proposal.proposed_ratings;

    await sql`
      UPDATE agent_briefs SET
        thesis = ${thesis},
        drivers = ${JSON.stringify(drivers)}::jsonb,
        risks = ${JSON.stringify(risks)}::jsonb,
        ratings = ${JSON.stringify(ratings)}::jsonb,
        updated_at = NOW()
      WHERE agent_key = ${agentKey}
    `;

    await sql`
      UPDATE brief_proposals SET
        status = 'accepted',
        resolved_at = NOW()
      WHERE agent_key = ${agentKey} AND status = 'pending'
    `;

    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    await sql`
      UPDATE brief_proposals SET
        status = 'rejected',
        resolved_at = NOW()
      WHERE agent_key = ${agentKey} AND status = 'pending'
    `;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
