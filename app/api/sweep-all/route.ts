export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { AGENTS } from '@/lib/agents-config';

// Ordered list of sweepable agents (hasSweep=true), in sweep priority order.
// This is the single source of truth for sweep ordering.
const SWEEP_ORDER = AGENTS.filter(a => a.hasSweep).map(a => a.agent_key);

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

async function handleSeed(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let seeded = 0;

  for (let i = 0; i < SWEEP_ORDER.length; i++) {
    const result = await sql`
      INSERT INTO sweep_queue (agent_key, sweep_date, sweep_order, status)
      VALUES (${SWEEP_ORDER[i]}, ${today}, ${i + 1}, 'pending')
      ON CONFLICT (agent_key, sweep_date) DO NOTHING
    `;
    // @ts-expect-error — neon sql returns count on insert
    if (result.count > 0 || result.length > 0) seeded++;
  }

  console.log(`[sweep-all] Queue seeded: ${seeded} new / ${SWEEP_ORDER.length} total for ${today}`);
  return NextResponse.json({ ok: true, seeded, total: SWEEP_ORDER.length, date: today });
}

export async function GET(req: NextRequest) {
  return handleSeed(req);
}

export async function POST(req: NextRequest) {
  return handleSeed(req);
}
