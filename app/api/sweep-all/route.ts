import { NextRequest, NextResponse } from 'next/server';

// Sequential sweep chain — 19 agents, SHRINK excluded (no company coverage)
const SWEEP_CHAIN = [
  'APEX', 'DRAGON', 'FERRO', 'FORGE', 'FORGE_JP',
  'HELIX', 'INDRA', 'LAYER', 'NOVA', 'OPTIM',
  'ORIENT', 'PHOTON', 'PIXEL', 'RACK', 'SURGE',
  'SYNTH', 'TERRA', 'TIDE', 'VOLT',
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';

  // Auth — accept Vercel cron header or x-cron-secret for manual triggers
  const authHeader = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  if (authHeader !== `Bearer ${secret}` && cronSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams, origin } = new URL(req.url);
  const agentParam = (searchParams.get('agent') || SWEEP_CHAIN[0]).toUpperCase();

  const currentIdx = SWEEP_CHAIN.indexOf(agentParam);
  if (currentIdx === -1) {
    return NextResponse.json({ error: `Unknown agent: ${agentParam}` }, { status: 400 });
  }

  const nextAgent = currentIdx + 1 < SWEEP_CHAIN.length ? SWEEP_CHAIN[currentIdx + 1] : null;

  // ── Run sweep for this agent ──────────────────────────────────────────────
  let sweepResult: Record<string, unknown> = {};
  try {
    const sweepRes = await fetch(`${origin}/api/sector-sweep?agent=${agentParam}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'x-cron-secret': secret,
      },
    });
    sweepResult = await sweepRes.json();
    console.log(`[sweep-all] ${agentParam} done (${currentIdx + 1}/${SWEEP_CHAIN.length})`);
  } catch (err) {
    // Log error but always continue the chain
    console.error(`[sweep-all] ${agentParam} sweep error:`, err);
    sweepResult = { error: String(err) };
  }

  // ── Fire next agent in chain (fire and forget — do not await) ─────────────
  if (nextAgent) {
    fetch(`${origin}/api/sweep-all?agent=${nextAgent}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'x-cron-secret': secret,
      },
    }).catch(err => {
      console.error(`[sweep-all] Failed to trigger next agent ${nextAgent}:`, err);
    });
  }

  return NextResponse.json({
    agent:    agentParam,
    position: `${currentIdx + 1}/${SWEEP_CHAIN.length}`,
    next:     nextAgent,
    result:   sweepResult,
  });
}
