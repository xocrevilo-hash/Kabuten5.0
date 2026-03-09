// app/api/seed-agent/route.ts
//
// Safe, non-destructive single-agent seeder.
// Used to add new agents to the DB without re-running /api/seed (which drops all tables).
//
// Usage (from logged-in browser):
//   GET /api/seed-agent?key=masa
//   GET /api/seed-agent?key=ginko
//
// Protected by session cookie (same auth as sweep button).

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key')?.toLowerCase();

  if (!key) {
    return NextResponse.json({ error: 'Missing ?key= parameter' }, { status: 400 });
  }

  const agent = AGENTS.find(a => a.agent_key === key);
  if (!agent) {
    return NextResponse.json({ error: `Agent '${key}' not found in agents-config.ts` }, { status: 404 });
  }

  // 1. Upsert sector_agents row
  await sql`
    INSERT INTO sector_agents (agent_key, agent_name, sector_name, colour)
    VALUES (${agent.agent_key}, ${agent.agent_name}, ${agent.sector_name}, ${agent.colour})
    ON CONFLICT (agent_key) DO NOTHING
  `;

  // 2. Upsert agent_briefs row (empty)
  await sql`
    INSERT INTO agent_briefs (agent_key, thesis, drivers, risks, ratings)
    VALUES (${agent.agent_key}, NULL, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
    ON CONFLICT (agent_key) DO NOTHING
  `;

  // 3. Upsert agent_threads row (empty)
  await sql`
    INSERT INTO agent_threads (agent_key, thread_history)
    VALUES (${agent.agent_key}, '[]'::jsonb)
    ON CONFLICT (agent_key) DO NOTHING
  `;

  // 4. Insert companies from seed.json that belong to this agent
  const companies = (seedData as SeedCompany[]).filter(c => c.agent_key === agent.agent_key);
  let companiesInserted = 0;
  for (const company of companies) {
    const result = await sql`
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
      ON CONFLICT (ticker) DO NOTHING
    `;
    if (result.count > 0) companiesInserted++;
  }

  return NextResponse.json({
    success: true,
    agent: agent.agent_key,
    agent_name: agent.agent_name,
    companies_inserted: companiesInserted,
    companies_in_seed: companies.length,
    message: `${agent.agent_name} is now in the database. Reload the Sectors page to see it.`,
  });
}
