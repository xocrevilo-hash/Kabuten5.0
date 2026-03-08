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
    // ── 1. Drop tables in dependency order ──────────────────────
    await sql`DROP TABLE IF EXISTS bloomberg_data CASCADE`;
    await sql`DROP TABLE IF EXISTS podcast_summaries CASCADE`;
    await sql`DROP TABLE IF EXISTS heatmap_scans CASCADE`;
    await sql`DROP TABLE IF EXISTS cross_company_signals CASCADE`;
    await sql`DROP TABLE IF EXISTS action_log CASCADE`;
    await sql`DROP TABLE IF EXISTS agent_threads CASCADE`;
    await sql`DROP TABLE IF EXISTS brief_proposals CASCADE`;
    await sql`DROP TABLE IF EXISTS agent_briefs CASCADE`;
    await sql`DROP TABLE IF EXISTS companies CASCADE`;
    await sql`DROP TABLE IF EXISTS sector_agents CASCADE`;

    // ── 2. Create tables ─────────────────────────────────────────
    await sql`
      CREATE TABLE sector_agents (
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
      CREATE TABLE companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        ticker TEXT NOT NULL,
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
      CREATE TABLE agent_briefs (
        id SERIAL PRIMARY KEY,
        agent_key TEXT REFERENCES sector_agents(agent_key),
        thesis TEXT,
        drivers JSONB,
        risks JSONB,
        ratings JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE brief_proposals (
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
      CREATE TABLE agent_threads (
        id SERIAL PRIMARY KEY,
        agent_key TEXT REFERENCES sector_agents(agent_key),
        thread_history JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE action_log (
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
      CREATE TABLE cross_company_signals (
        id SERIAL PRIMARY KEY,
        agent_key TEXT,
        signal TEXT,
        related_tickers TEXT[],
        swept_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE heatmap_scans (
        id SERIAL PRIMARY KEY,
        keyword TEXT NOT NULL,
        view_count INTEGER,
        heat_score NUMERIC(5,2),
        scanned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE podcast_summaries (
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
      CREATE TABLE bloomberg_data (
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
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE UNIQUE INDEX idx_bloomberg_ticker ON bloomberg_data(ticker)`;

    // ── 3. Seed sector agents ────────────────────────────────────
    for (const agent of AGENTS) {
      await sql`
        INSERT INTO sector_agents (agent_key, agent_name, sector_name, colour)
        VALUES (${agent.agent_key}, ${agent.agent_name}, ${agent.sector_name}, ${agent.colour})
      `;
    }

    // ── 4. Seed companies ────────────────────────────────────────
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
      `;
    }

    // ── 5. Create initial empty agent_briefs & agent_threads ─────
    for (const agent of AGENTS) {
      await sql`
        INSERT INTO agent_briefs (agent_key, thesis, drivers, risks, ratings)
        VALUES (${agent.agent_key}, NULL, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
      `;
      await sql`
        INSERT INTO agent_threads (agent_key, thread_history)
        VALUES (${agent.agent_key}, '[]'::jsonb)
      `;
    }

    // ── 6. Return summary ────────────────────────────────────────
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
