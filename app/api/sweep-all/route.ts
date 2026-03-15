export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

const AGENT_CHAIN = [
  'APEX', 'DRAGON', 'ELON', 'FERRO', 'FORGE_CN', 'FORGE_JP', 'FORGE_US', 'HELIX', 'INDRA',
  'LAYER', 'LAYER_TW', 'CHIP', 'MARIO', 'MASA', 'NOVA', 'OPTIM', 'ORIENT', 'ORIENT_MID',
  'PHOTON', 'PILBARA', 'RACK', 'ROCKET', 'SURGE', 'SYNTH', 'TERRA', 'TIDE', 'VOLT',
];

async function handleSweep(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const currentAgent = searchParams.get('agent') || AGENT_CHAIN[0];
  const currentIndex = AGENT_CHAIN.indexOf(currentAgent);
  const nextAgent = AGENT_CHAIN[currentIndex + 1] ?? null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';

  // Fire sector-sweep for this agent, passing the next agent so it can self-chain
  // when it finishes. We await a short delay after the fetch to ensure the HTTP
  // request is actually sent before Vercel freezes the function on response.
  const nextParam = nextAgent ? `&next=${nextAgent}` : '';
  const dispatchPromise = fetch(`${baseUrl}/api/sector-sweep?agent=${currentAgent}${nextParam}`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${cronSecret}`,
      'content-type': 'application/json',
    },
  }).catch(err => console.error(`[sweep-all] dispatch ${currentAgent}:`, err));

  // Yield to the event loop so the TCP connection is established before we return.
  // Without this, Vercel can freeze the function before the outgoing request is sent.
  await Promise.race([
    dispatchPromise,
    new Promise(r => setTimeout(r, 5000)), // max 5s wait — sector-sweep responds fast
  ]);

  console.log(`[sweep-all] Dispatched ${currentAgent} → next: ${nextAgent ?? 'DONE'}`);

  return Response.json({
    ok: true,
    dispatched: currentAgent,
    next: nextAgent ?? 'DONE',
  });
}

export async function GET(request: NextRequest) {
  return handleSweep(request);
}

export async function POST(request: NextRequest) {
  return handleSweep(request);
}
