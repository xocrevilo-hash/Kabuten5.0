export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// All sweepable agents in chain order
const AGENT_CHAIN = [
  'APEX', 'DRAGON', 'ELON', 'FERRO', 'FORGE_CN', 'FORGE_JP', 'FORGE_US', 'HELIX', 'INDRA',
  'LAYER', 'LAYER_TW', 'CHIP', 'MARIO', 'MASA', 'NOVA', 'OPTIM', 'ORIENT', 'ORIENT_MID',
  'PHOTON', 'IRONY', 'RACK', 'ROCKET', 'SURGE', 'SYNTH', 'TERRA', 'TIDE', 'VOLT',
];

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find agents that haven't been swept in the last 20 hours
  const rows = await sql`
    SELECT agent_key, MAX(swept_at) as last_swept
    FROM action_log
    GROUP BY agent_key
  `;

  const swept = new Map<string, Date>();
  for (const r of rows) swept.set(r.agent_key.toUpperCase(), new Date(r.last_swept));

  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const missed = AGENT_CHAIN.filter(a => {
    const t = swept.get(a);
    return !t || t < cutoff;
  });

  if (missed.length === 0) {
    console.log('[sweep-catchup] All agents swept — nothing to do.');
    return NextResponse.json({ ok: true, missed: 0, agents: [] });
  }

  console.log(`[sweep-catchup] ${missed.length} missed agents: ${missed.join(', ')}`);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
  const cronSecret = process.env.CRON_SECRET;
  const headers = {
    'authorization': `Bearer ${cronSecret ?? ''}`,
    'content-type': 'application/json',
  };

  // Kick the first missed agent via sweep-all so the chain self-propagates
  const firstMissed = missed[0];
  fetch(`${baseUrl}/api/sweep-all?agent=${firstMissed}`, {
    method: 'GET',
    headers,
  }).catch(err => console.error(`[sweep-catchup] dispatch ${firstMissed}:`, err));

  return NextResponse.json({ ok: true, missed: missed.length, agents: missed, kicking: firstMissed });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
