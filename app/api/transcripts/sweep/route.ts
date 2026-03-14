import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents-config';

// Weekly transcript sweep — kicks off the scan chain starting from the first agent.
// Triggered by Vercel cron: 0 20 * * 1 (Monday 20:00 UTC)
// Each scan/?agent=X handles its companies then chains to the next agent.

function isAuthorized(req: NextRequest): boolean {
  // Allow Vercel cron (sends Authorization: Bearer <CRON_SECRET>)
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const xHeader = req.headers.get('x-cron-secret');
  const auth = req.headers.get('authorization');
  return xHeader === secret || auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const firstAgent = AGENTS.find((a) => a.hasSweep && a.tickers.length > 0);
  if (!firstAgent) {
    return NextResponse.json({ error: 'No sweep agents found' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
  const url = `${baseUrl}/api/transcripts/scan?agent=${firstAgent.agent_key.toUpperCase()}`;

  // Fire-and-forget — the chain runs itself from here
  fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
  }).catch(() => {/* best-effort */});

  return NextResponse.json({
    started: true,
    first_agent: firstAgent.agent_key.toUpperCase(),
    total_agents: AGENTS.filter((a) => a.hasSweep && a.tickers.length > 0).length,
    message: 'Transcript sweep chain started',
  });
}
