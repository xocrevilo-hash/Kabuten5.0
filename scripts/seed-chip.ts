/**
 * Targeted seed script: insert CHIP agent + companies into live Neon DB
 * without touching any existing data.
 *
 * Usage:
 *   cd "/Users/olivercox/Desktop/Kabuten5.0 20.29.52"
 *   npx tsx scripts/seed-chip.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log('── CHIP seed script ──────────────────────────────────');

  // 1. Upsert CHIP into sector_agents
  await sql`
    INSERT INTO sector_agents (agent_key, agent_name, sector_name, colour)
    VALUES ('chip', 'CHIP', 'Taiwan Mid-Caps', 'cyan')
    ON CONFLICT (agent_key) DO UPDATE SET
      agent_name  = EXCLUDED.agent_name,
      sector_name = EXCLUDED.sector_name,
      colour      = EXCLUDED.colour
  `;
  console.log('✓ sector_agents: CHIP upserted');

  // 2. Upsert the 3 CHIP companies
  const companies = [
    { name: 'MPI',               ticker: '6223.TW', exchange: 'TWSE', country: 'TW', sector: 'Test & Measurement',    bbg: '6223 TT Equity' },
    { name: 'Chroma ATE',        ticker: '2360.TW', exchange: 'TWSE', country: 'TW', sector: 'Test & Measurement',    bbg: '2360 TT Equity' },
    { name: 'Phison Electronics', ticker: '8299.TW', exchange: 'TWSE', country: 'TW', sector: 'NAND Flash Controllers', bbg: '8299 TT Equity' },
  ];

  for (const c of companies) {
    // Check if ticker already exists
    const existing = await sql`SELECT id FROM companies WHERE ticker = ${c.ticker}`;
    if (existing.length > 0) {
      await sql`
        UPDATE companies
        SET agent_key = 'chip', name = ${c.name}, bbg_ticker = ${c.bbg},
            sector = ${c.sector}, country = ${c.country}
        WHERE ticker = ${c.ticker}
      `;
      console.log(`✓ companies: updated ${c.ticker} → chip`);
    } else {
      await sql`
        INSERT INTO companies (name, ticker, bbg_ticker, exchange, country, sector, agent_key, classification)
        VALUES (${c.name}, ${c.ticker}, ${c.bbg}, ${c.exchange}, ${c.country}, ${c.sector}, 'chip', 'mid_cap')
      `;
      console.log(`✓ companies: inserted ${c.ticker}`);
    }
  }

  // 3. Ensure agent_threads row exists for CHIP (for chat history)
  const threadCheck = await sql`SELECT id FROM agent_threads WHERE agent_key = 'chip' LIMIT 1`;
  if (threadCheck.length === 0) {
    await sql`
      INSERT INTO agent_threads (agent_key, role, content, message_type)
      VALUES ('chip', 'system', 'CHIP agent initialised.', 'system')
    `;
    console.log('✓ agent_threads: CHIP initialised');
  } else {
    console.log('✓ agent_threads: CHIP already has history');
  }

  console.log('\n✅ Done — CHIP agent seeded successfully');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
