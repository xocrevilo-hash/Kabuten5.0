export const dynamic = 'force-dynamic';

/**
 * sweep-worker  —  runs every 5 minutes via Vercel cron.
 *
 * Replaces the old daisy-chain mechanism. The chain was fragile: one timeout
 * in any of the 27 agents silently killed the rest of the run. This worker
 * uses a persistent DB queue instead. It:
 *
 *  1. Recovers any agent stuck 'running' for > 10 minutes (Vercel timeout).
 *  2. If another agent is currently running, backs off (returns immediately).
 *  3. Picks the next 'pending' agent and fires sector-sweep for it.
 *
 * sector-sweep marks itself 'done' (or 'failed') in sweep_queue on completion.
 * The worker never needs to know about chaining.
 *
 * Timeline with 27 agents × ~4 min each + 1 min between = ~2.5 hours.
 * All agents swept by ~19:30 UTC when the main cron fires at 17:00.
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const STUCK_THRESHOLD_MINUTES = 10; // Vercel maxDuration is 300s = 5 min; 10 min is a safe dead-man

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

async function handleWorker(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
  const cronSecret = process.env.CRON_SECRET;

  // ── 1. Recover stuck agents ──────────────────────────────────────────────
  // Any agent marked 'running' but started > STUCK_THRESHOLD minutes ago
  // has almost certainly been killed by Vercel's timeout. Mark it 'failed'
  // so the worker can proceed to the next agent.
  const recovered = await sql`
    UPDATE sweep_queue
    SET status = 'failed',
        error = 'timeout — Vercel killed the function after ${STUCK_THRESHOLD_MINUTES} min',
        completed_at = NOW()
    WHERE status = 'running'
      AND sweep_date = ${today}
      AND started_at < NOW() - (${STUCK_THRESHOLD_MINUTES} || ' minutes')::INTERVAL
    RETURNING agent_key
  `;
  if (recovered.length > 0) {
    console.log(`[sweep-worker] Recovered stuck agents: ${recovered.map((r: { agent_key: string }) => r.agent_key).join(', ')}`);
  }

  // ── 2. Back off if another agent is actively running ────────────────────
  const running = await sql`
    SELECT agent_key FROM sweep_queue
    WHERE status = 'running' AND sweep_date = ${today}
    LIMIT 1
  `;
  if (running.length > 0) {
    return NextResponse.json({ ok: true, status: 'waiting', running_agent: running[0].agent_key });
  }

  // ── 3. Pick the next pending agent ──────────────────────────────────────
  const next = await sql`
    SELECT id, agent_key FROM sweep_queue
    WHERE status = 'pending' AND sweep_date = ${today}
    ORDER BY sweep_order ASC
    LIMIT 1
  `;

  if (next.length === 0) {
    // Nothing pending — check if anything at all is queued for today
    const total = await sql`
      SELECT COUNT(*) AS count FROM sweep_queue WHERE sweep_date = ${today}
    `;
    const status = Number(total[0].count) === 0 ? 'queue_not_seeded' : 'all_complete';
    return NextResponse.json({ ok: true, status });
  }

  const { id, agent_key } = next[0];

  // ── 4. Claim the row atomically to prevent double-dispatch ───────────────
  // (Two workers could theoretically fire in the same minute window — this
  //  UPDATE acts as a compare-and-swap.)
  const claimed = await sql`
    UPDATE sweep_queue
    SET status = 'running', started_at = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `;
  if (claimed.length === 0) {
    // Another worker won the race — do nothing
    return NextResponse.json({ ok: true, status: 'race_skipped' });
  }

  // ── 5. Fire sector-sweep (fire-and-forget with connection guarantee) ─────
  // We await briefly to ensure the TCP connection is established before
  // this function returns, preventing Vercel from GC-ing the outbound request.
  const dispatchPromise = fetch(
    `${baseUrl}/api/sector-sweep?agent=${agent_key.toUpperCase()}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cronSecret ?? ''}`,
        'content-type': 'application/json',
      },
    },
  ).catch(err => console.error(`[sweep-worker] dispatch ${agent_key}:`, err));

  // Wait up to 5 seconds for the connection to establish; sector-sweep then
  // runs independently in its own Vercel function invocation.
  await Promise.race([dispatchPromise, new Promise(r => setTimeout(r, 5000))]);

  console.log(`[sweep-worker] Dispatched ${agent_key}`);
  return NextResponse.json({ ok: true, status: 'dispatched', agent: agent_key });
}

export async function GET(req: NextRequest) {
  return handleWorker(req);
}

export async function POST(req: NextRequest) {
  return handleWorker(req);
}
