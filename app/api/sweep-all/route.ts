import { NextRequest } from 'next/server';

const AGENT_CHAIN = [
  'APEX', 'DRAGON', 'FERRO', 'FORGE', 'FORGE_JP', 'HELIX', 'INDRA', 'LAYER',
  'MARIO', 'NOVA', 'OPTIM', 'ORIENT', 'ORIENT_MID', 'PHOTON', 'PILBARA',
  'PIXEL', 'RACK', 'ROCKET', 'SURGE', 'SYNTH', 'TERRA', 'TIDE', 'VOLT'
];

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  if (cookies['kabuten-auth'] === 'true') return true;

  return false;
}

async function handleSweep(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const currentAgent = searchParams.get('agent') || AGENT_CHAIN[0];
  const currentIndex = AGENT_CHAIN.indexOf(currentAgent);

  console.log(`[sweep-all] Running sweep for: ${currentAgent}`);

  // Run this agent's sweep
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
    const sweepRes = await fetch(`${baseUrl}/api/sector-sweep?agent=${currentAgent}`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`,
        'content-type': 'application/json',
      },
    });
    console.log(`[sweep-all] ${currentAgent} sweep: ${sweepRes.status}`);
  } catch (err) {
    console.error(`[sweep-all] ${currentAgent} failed:`, err);
    // Always continue to next agent even on error
  }

  // Chain to next agent — fire and forget, use GET
  const nextAgent = AGENT_CHAIN[currentIndex + 1];
  if (nextAgent) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
    fetch(`${baseUrl}/api/sweep-all?agent=${nextAgent}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    }).catch(err => console.error(`[sweep-all] Failed to chain to ${nextAgent}:`, err));
  } else {
    console.log('[sweep-all] Chain complete — all agents swept.');
  }

  return Response.json({
    ok: true,
    swept: currentAgent,
    next: nextAgent ?? null,
  });
}

// Export both GET and POST so chain works regardless of method
export async function GET(request: NextRequest) {
  return handleSweep(request);
}

export async function POST(request: NextRequest) {
  return handleSweep(request);
}
