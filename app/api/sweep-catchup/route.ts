export const dynamic = 'force-dynamic';

/**
 * sweep-catchup  —  runs at 22:00 UTC as a fail-safe.
 *
 * The new queue architecture (sweep-worker polling every 5 min) makes this
 * largely redundant, but it acts as a final safety net for the edge case where
 * sweep-worker itself had a bad run.
 *
 * All it does is:
 *  1. Reset any 'failed' or still-'running' (stuck) queue entries back to 'pending'.
 *  2. The sweep-worker will pick them up on its next poll.
 *
 * It does NOT try to directly dispatch agents — that is sweep-worker's job.
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

async function handleCatchup(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Re-queue anything that failed or got stuck today
  const requeued = await sql`
    UPDATE sweep_queue
    SET status = 'pending', error = NULL, started_at = NULL, completed_at = NULL
    WHERE sweep_date = ${today}
      AND status IN ('failed', 'running')
    RETURNING agent_key, status
  `;

  // Count what's done vs still pending
  const summary = await sql`
    SELECT status, COUNT(*) AS count
    FROM sweep_queue
    WHERE sweep_date = ${today}
    GROUP BY status
    ORDER BY status
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requeuedKeys = (requeued as any[]).map(r => r.agent_key as string);
  console.log(`[sweep-catchup] Re-queued ${requeued.length} agents: ${requeuedKeys.join(', ') || 'none'}`);

  return NextResponse.json({
    ok: true,
    date: today,
    requeued: requeued.length,
    requeued_agents: requeuedKeys,
    queue_summary: summary,
  });
}

export async function GET(req: NextRequest) {
  return handleCatchup(req);
}

export async function POST(req: NextRequest) {
  return handleCatchup(req);
}
