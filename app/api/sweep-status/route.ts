export const dynamic = 'force-dynamic';

/**
 * GET /api/sweep-status
 *
 * Returns today's sweep queue so you can see exactly which agents have run,
 * which are running, which are pending, and which failed.
 *
 * Useful for debugging when the daily sweep doesn't fire correctly.
 */

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await sql`
    SELECT
      agent_key,
      sweep_order,
      status,
      queued_at,
      started_at,
      completed_at,
      error,
      CASE
        WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INT
        WHEN started_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (NOW() - started_at))::INT
        ELSE NULL
      END AS duration_seconds
    FROM sweep_queue
    WHERE sweep_date = ${today}
    ORDER BY sweep_order ASC
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = rows as any[];
  const counts = {
    total:   r.length,
    done:    r.filter(x => x.status === 'done').length,
    running: r.filter(x => x.status === 'running').length,
    pending: r.filter(x => x.status === 'pending').length,
    failed:  r.filter(x => x.status === 'failed').length,
  };

  return NextResponse.json({
    date: today,
    summary: counts,
    agents: r,
  });
}
