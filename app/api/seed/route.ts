import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { AGENTS } from '@/lib/agents-config';
import seedData from '@/data/seed.json';

interface SeedCompany {
  name: string;
  ticker: string;
  exchange: string;
  country: string;
  sector: string;
  agent_key: string | null;
  classification: string;
  bbg_ticker: string;
}

export async function GET() {
  try {
    // ── 1. Create tables (safe — never drops existing data) ───────
    await sql`
      CREATE TABLE IF NOT EXISTS sector_agents (
        id SERIAL PRIMARY KEY,
        agent_key TEXT UNIQUE NOT NULL,
        agent_name TEXT NOT NULL,
        sector_name TEXT NOT NULL,
        colour TEXT NOT NULL,
        investment_mandate TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        ticker TEXT UNIQUE NOT NULL,
        bbg_ticker TEXT,
        exchange TEXT NOT NULL,
        country TEXT NOT NULL,
        sector TEXT,
        agent_key TEXT REFERENCES sector_agents(agent_key),
        market_cap_usd NUMERIC,
        classification TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS agent_briefs (
        id SERIAL PRIMARY KEY,
        agent_key TEXT UNIQUE REFERENCES sector_agents(agent_key),
        thesis TEXT,
        drivers JSONB,
        risks JSONB,
        ratings JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS brief_proposals (
        id SERIAL PRIMARY KEY,
        agent_key TEXT REFERENCES sector_agents(agent_key),
        proposed_thesis TEXT,
        proposed_drivers JSONB,
        proposed_risks JSONB,
        proposed_ratings JSONB,
        reasoning TEXT,
        status TEXT DEFAULT 'pending',
        proposed_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS agent_threads (
        id SERIAL PRIMARY KEY,
        agent_key TEXT UNIQUE REFERENCES sector_agents(agent_key),
        thread_history JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS action_log (
        id SERIAL PRIMARY KEY,
        agent_key TEXT,
        company_ticker TEXT,
        classification TEXT,
        headline TEXT,
        detail TEXT,
        catalyst_update TEXT,
        earnings_summary TEXT,
        swept_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cross_company_signals (
        id SERIAL PRIMARY KEY,
        agent_key TEXT,
        signal TEXT,
        related_tickers TEXT[],
        swept_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS heatmap_scans (
        id SERIAL PRIMARY KEY,
        keyword TEXT NOT NULL,
        view_count INTEGER,
        heat_score NUMERIC(5,2),
        scanned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS podcast_summaries (
        id SERIAL PRIMARY KEY,
        podcast_name TEXT NOT NULL,
        episode_title TEXT NOT NULL,
        episode_date DATE,
        bullets TEXT[] NOT NULL DEFAULT '{}',
        tickers TEXT[],
        source_url TEXT,
        has_relevant_content BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        scanned_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_podcast_episode UNIQUE (podcast_name, episode_title)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_podcast_summaries_date ON podcast_summaries(episode_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_podcast_summaries_name ON podcast_summaries(podcast_name)`;

    await sql`
      CREATE TABLE IF NOT EXISTS bloomberg_data (
        id SERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        bbg_ticker TEXT NOT NULL,
        px_last NUMERIC,
        fwd_pe NUMERIC,
        ev_ebitda NUMERIC,
        consensus_eps_fy1 NUMERIC,
        consensus_eps_fy2 NUMERIC,
        consensus_rev_fy1 NUMERIC,
        target_price_mean NUMERIC,
        target_price_high NUMERIC,
        target_price_low NUMERIC,
        buy_count INTEGER,
        hold_count INTEGER,
        sell_count INTEGER,
        short_interest_ratio NUMERIC,
        next_earnings_date DATE,
        high_52w NUMERIC,
        low_52w NUMERIC,
        ytd_return NUMERIC,
        dividend_yield NUMERIC,
        market_cap NUMERIC,
        -- Expanded: earnings actuals
        actual_eps_last  NUMERIC,
        actual_rev_last  NUMERIC,
        eps_surprise_pct NUMERIC,
        rev_surprise_pct NUMERIC,
        last_report_date DATE,
        guidance_eps_hi  NUMERIC,
        guidance_eps_lo  NUMERIC,
        -- Expanded: EPS revision momentum
        eps_rev_1m   NUMERIC,
        eps_rev_3m   NUMERIC,
        rev_rev_1m   NUMERIC,
        rev_rev_3m   NUMERIC,
        est_up_1m    INTEGER,
        est_down_1m  INTEGER,
        best_eps_ntm NUMERIC,
        -- v3 columns
        px_to_book    NUMERIC,
        median_eps_fy1 NUMERIC,
        num_estimates  INTEGER,
        eps_std_dev    NUMERIC,
        -- v4 columns
        avg_volume NUMERIC,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bloomberg_ticker ON bloomberg_data(ticker)`;

    await sql`
      CREATE TABLE IF NOT EXISTS valuation_history (
        id            SERIAL PRIMARY KEY,
        ticker        TEXT NOT NULL,
        snapshot_date DATE NOT NULL,
        fwd_pe        NUMERIC,
        ev_ebitda     NUMERIC,
        px_last       NUMERIC,
        market_cap    NUMERIC,
        px_to_book    NUMERIC,
        UNIQUE(ticker, snapshot_date)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_val_hist_ticker ON valuation_history(ticker)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_val_hist_date   ON valuation_history(snapshot_date DESC)`;

    await sql`
      CREATE TABLE IF NOT EXISTS earnings_transcripts (
        id              SERIAL PRIMARY KEY,
        ticker          TEXT NOT NULL,
        agent_key       TEXT REFERENCES sector_agents(agent_key),
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
    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_agent ON earnings_transcripts(agent_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_date ON earnings_transcripts(report_date DESC NULLS LAST)`;

    // ── 1b. Ensure UNIQUE indexes exist (idempotent — safe on live DBs) ─
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS sector_agents_agent_key_idx ON sector_agents (agent_key)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS companies_ticker_idx        ON companies     (ticker)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS agent_briefs_agent_key_idx  ON agent_briefs  (agent_key)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS agent_threads_agent_key_idx ON agent_threads (agent_key)`;

    // ── 2. Seed sector agents (upsert name/sector; remove stale keys) ────
    const activeKeys = AGENTS.map(a => a.agent_key);
    for (const agent of AGENTS) {
      await sql`
        INSERT INTO sector_agents (agent_key, agent_name, sector_name, colour)
        VALUES (${agent.agent_key}, ${agent.agent_name}, ${agent.sector_name}, ${agent.colour})
        ON CONFLICT (agent_key) DO UPDATE SET
          agent_name  = EXCLUDED.agent_name,
          sector_name = EXCLUDED.sector_name,
          colour      = EXCLUDED.colour
      `;
    }
    // Remove any sector_agents rows no longer in config (e.g. renamed agents)
    // Must null-out FK references first to avoid constraint violations
    await sql`
      UPDATE companies SET agent_key = NULL
      WHERE agent_key NOT IN ${sql(activeKeys)}
    `;
    await sql`
      DELETE FROM brief_proposals  WHERE agent_key NOT IN ${sql(activeKeys)}
    `;
    await sql`
      DELETE FROM agent_briefs     WHERE agent_key NOT IN ${sql(activeKeys)}
    `;
    await sql`
      DELETE FROM agent_threads    WHERE agent_key NOT IN ${sql(activeKeys)}
    `;
    await sql`
      DELETE FROM sector_agents    WHERE agent_key NOT IN ${sql(activeKeys)}
    `;

    // ── 3. Seed companies (skip existing, update bbg_ticker) ─────
    const companies = seedData as SeedCompany[];
    for (const company of companies) {
      await sql`
        INSERT INTO companies (name, ticker, bbg_ticker, exchange, country, sector, agent_key, classification)
        VALUES (
          ${company.name},
          ${company.ticker},
          ${company.bbg_ticker},
          ${company.exchange},
          ${company.country},
          ${company.sector},
          ${company.agent_key},
          ${company.classification}
        )
        ON CONFLICT (ticker) DO UPDATE SET
          bbg_ticker = EXCLUDED.bbg_ticker,
          name = EXCLUDED.name,
          exchange = EXCLUDED.exchange,
          country = EXCLUDED.country,
          sector = EXCLUDED.sector,
          agent_key = EXCLUDED.agent_key,
          classification = EXCLUDED.classification
      `;
    }

    // ── 4. Init agent_briefs & agent_threads (skip existing) ─────
    for (const agent of AGENTS) {
      await sql`
        INSERT INTO agent_briefs (agent_key, thesis, drivers, risks, ratings)
        VALUES (${agent.agent_key}, NULL, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
        ON CONFLICT (agent_key) DO NOTHING
      `;
      await sql`
        INSERT INTO agent_threads (agent_key, thread_history)
        VALUES (${agent.agent_key}, '[]'::jsonb)
        ON CONFLICT (agent_key) DO NOTHING
      `;
    }

    // ── 5. Return summary ────────────────────────────────────────
    const agentCount = await sql`SELECT COUNT(*) AS count FROM sector_agents`;
    const companyCount = await sql`SELECT COUNT(*) AS count FROM companies`;
    const briefCount = await sql`SELECT COUNT(*) AS count FROM agent_briefs`;

    return NextResponse.json({
      success: true,
      summary: {
        agents_seeded: Number(agentCount[0].count),
        companies_seeded: Number(companyCount[0].count),
        briefs_initialized: Number(briefCount[0].count),
        tables_created: [
          'sector_agents',
          'companies',
          'agent_briefs',
          'brief_proposals',
          'agent_threads',
          'action_log',
          'cross_company_signals',
          'heatmap_scans',
          'podcast_summaries',
          'bloomberg_data',
          'valuation_history',
          'earnings_transcripts',
        ],
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
