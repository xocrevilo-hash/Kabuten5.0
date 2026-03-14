import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Safe migration — creates earnings_transcripts table without touching any other tables.
// Run once: GET /api/transcripts/migrate
export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS earnings_transcripts (
        id              SERIAL PRIMARY KEY,
        ticker          TEXT NOT NULL,
        agent_key       TEXT,
        fiscal_period   TEXT NOT NULL DEFAULT 'Latest',
        report_date     DATE,
        revenue_actual  NUMERIC,
        revenue_unit    TEXT,
        eps_actual      NUMERIC,
        vs_consensus    TEXT,
        guidance        TEXT,
        management_tone TEXT,
        key_themes      TEXT[] DEFAULT '{}',
        summary         TEXT,
        source_url      TEXT,
        scanned_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ticker, fiscal_period)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_ticker ON earnings_transcripts(ticker)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_agent  ON earnings_transcripts(agent_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_date   ON earnings_transcripts(report_date DESC NULLS LAST)`;

    const count = await sql`SELECT COUNT(*) AS count FROM earnings_transcripts`;

    return NextResponse.json({
      success: true,
      message: 'earnings_transcripts table ready',
      existing_rows: Number(count[0].count),
    });
  } catch (error) {
    console.error('Transcript migrate error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
