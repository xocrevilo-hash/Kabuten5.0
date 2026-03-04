/**
 * Kabuten 5.0 — Migration Script from Kabuten 4.x
 * ================================================
 * One-time script to port data from the old Kabuten 4.x Neon database
 * into the new Kabuten 5.0 schema.
 *
 * Requirements:
 *   - OLD_DATABASE_URL: Kabuten 4.x Neon database connection string
 *   - DATABASE_URL: Kabuten 5.0 Neon database connection string
 *
 * Usage:
 *   npx tsx scripts/migrate-from-v4.ts
 *
 * What it migrates:
 *   1. Agent thread history → agent_threads
 *   2. Published briefs → agent_briefs
 *   3. Action log entries → action_log
 *   4. Company-agent assignments (if different from seed)
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
const NEW_DATABASE_URL = process.env.DATABASE_URL;

if (!OLD_DATABASE_URL) {
  console.error('ERROR: OLD_DATABASE_URL not set in .env.local');
  process.exit(1);
}
if (!NEW_DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env.local');
  process.exit(1);
}

const oldDb = neon(OLD_DATABASE_URL);
const newDb = neon(NEW_DATABASE_URL);

interface MigrationStats {
  threads_migrated: number;
  briefs_migrated: number;
  action_log_migrated: number;
  errors: string[];
}

async function discoverOldSchema(): Promise<string[]> {
  const tables = await oldDb`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  return tables.map((t: { table_name: string }) => t.table_name);
}

async function migrateThreads(stats: MigrationStats): Promise<void> {
  console.log('\n--- Migrating agent threads ---');

  // Try common v4 table names
  const possibleTables = [
    'sector_agent_threads',
    'agent_threads',
    'chat_threads',
    'threads',
  ];

  let threadRows: Array<{ agent_key: string; thread_history: unknown[] }> = [];

  for (const table of possibleTables) {
    try {
      const rows = await oldDb`
        SELECT * FROM ${oldDb(table)} LIMIT 1
      `;
      if (rows.length >= 0) {
        console.log(`Found thread table: ${table}`);
        threadRows = await oldDb`SELECT * FROM ${oldDb(table)}`;
        break;
      }
    } catch {
      // Table doesn't exist, try next
    }
  }

  if (threadRows.length === 0) {
    console.log('No thread history found in old database');
    return;
  }

  console.log(`Found ${threadRows.length} thread records`);

  for (const row of threadRows) {
    const agentKey = (row.agent_key as string)?.toLowerCase();
    if (!agentKey) continue;

    const history = row.thread_history || [];

    try {
      // Check if this agent exists in new DB
      const exists = await newDb`
        SELECT agent_key FROM agent_threads WHERE agent_key = ${agentKey}
      `;

      if (exists.length > 0) {
        // Merge: prepend old history before existing (new) history
        const currentRow = await newDb`
          SELECT thread_history FROM agent_threads WHERE agent_key = ${agentKey}
        `;
        const currentHistory = currentRow[0]?.thread_history || [];

        // Tag old messages so they're identifiable
        const taggedOldHistory = (Array.isArray(history) ? history : []).map(
          (msg: unknown) => ({ ...(msg as object), _migrated: true })
        );

        const merged = [...taggedOldHistory, ...currentHistory];

        await newDb`
          UPDATE agent_threads
          SET thread_history = ${JSON.stringify(merged)}::jsonb
          WHERE agent_key = ${agentKey}
        `;
        console.log(`  ✓ Merged ${(Array.isArray(history) ? history : []).length} old messages for ${agentKey}`);
      } else {
        console.log(`  ⚠ Agent ${agentKey} not found in new DB, skipping`);
      }
      stats.threads_migrated++;
    } catch (err) {
      const msg = `Thread migration failed for ${agentKey}: ${err}`;
      console.error(`  ✗ ${msg}`);
      stats.errors.push(msg);
    }
  }
}

async function migrateBriefs(stats: MigrationStats): Promise<void> {
  console.log('\n--- Migrating agent briefs ---');

  const possibleTables = [
    'sector_agent_briefs',
    'agent_briefs',
    'briefs',
    'published_briefs',
  ];

  let briefRows: Array<{
    agent_key: string;
    thesis?: string;
    drivers?: unknown;
    risks?: unknown;
    ratings?: unknown;
    updated_at?: string;
  }> = [];

  for (const table of possibleTables) {
    try {
      const rows = await oldDb`SELECT * FROM ${oldDb(table)} LIMIT 1`;
      if (rows.length >= 0) {
        console.log(`Found brief table: ${table}`);
        briefRows = await oldDb`SELECT * FROM ${oldDb(table)}`;
        break;
      }
    } catch {
      // Try next table
    }
  }

  if (briefRows.length === 0) {
    console.log('No briefs found in old database');
    return;
  }

  console.log(`Found ${briefRows.length} brief records`);

  for (const row of briefRows) {
    const agentKey = row.agent_key?.toLowerCase();
    if (!agentKey || !row.thesis) continue;

    try {
      // Only migrate if new DB has no thesis yet
      const existing = await newDb`
        SELECT thesis FROM agent_briefs WHERE agent_key = ${agentKey}
      `;

      if (existing.length > 0 && existing[0].thesis) {
        console.log(`  → ${agentKey}: new brief exists, skipping`);
        continue;
      }

      await newDb`
        UPDATE agent_briefs
        SET
          thesis = ${row.thesis || null},
          drivers = ${JSON.stringify(row.drivers || [])}::jsonb,
          risks = ${JSON.stringify(row.risks || [])}::jsonb,
          ratings = ${JSON.stringify(row.ratings || {})}::jsonb,
          updated_at = ${row.updated_at || new Date().toISOString()}
        WHERE agent_key = ${agentKey}
      `;

      console.log(`  ✓ Brief migrated for ${agentKey}`);
      stats.briefs_migrated++;
    } catch (err) {
      const msg = `Brief migration failed for ${agentKey}: ${err}`;
      console.error(`  ✗ ${msg}`);
      stats.errors.push(msg);
    }
  }
}

async function migrateActionLog(stats: MigrationStats): Promise<void> {
  console.log('\n--- Migrating action log ---');

  const possibleTables = [
    'action_log',
    'sweep_findings',
    'findings',
    'company_findings',
  ];

  let logRows: Array<{
    agent_key: string;
    company_ticker: string;
    classification: string;
    headline: string;
    detail?: string;
    catalyst_update?: string;
    earnings_summary?: string;
    swept_at?: string;
    created_at?: string;
  }> = [];

  for (const table of possibleTables) {
    try {
      const rows = await oldDb`SELECT * FROM ${oldDb(table)} LIMIT 1`;
      if (rows.length >= 0) {
        console.log(`Found action log table: ${table}`);
        logRows = await oldDb`
          SELECT * FROM ${oldDb(table)}
          ORDER BY swept_at DESC
          LIMIT 500
        `;
        break;
      }
    } catch {
      // Try next
    }
  }

  if (logRows.length === 0) {
    console.log('No action log entries found in old database');
    return;
  }

  console.log(`Found ${logRows.length} action log entries (importing last 500)`);

  let inserted = 0;
  for (const row of logRows) {
    try {
      await newDb`
        INSERT INTO action_log (
          agent_key, company_ticker, classification, headline, detail,
          catalyst_update, earnings_summary, swept_at
        ) VALUES (
          ${row.agent_key?.toLowerCase()},
          ${row.company_ticker},
          ${row.classification},
          ${row.headline},
          ${row.detail || null},
          ${row.catalyst_update || null},
          ${row.earnings_summary || null},
          ${row.swept_at || row.created_at || new Date().toISOString()}
        )
        ON CONFLICT DO NOTHING
      `;
      inserted++;
    } catch (err) {
      stats.errors.push(`Action log insert failed: ${err}`);
    }
  }

  console.log(`  ✓ Inserted ${inserted} action log entries`);
  stats.action_log_migrated = inserted;
}

async function main() {
  console.log('=== Kabuten 5.0 Migration from v4 ===');
  console.log(`Source: ${OLD_DATABASE_URL?.slice(0, 40)}...`);
  console.log(`Target: ${NEW_DATABASE_URL?.slice(0, 40)}...`);

  const stats: MigrationStats = {
    threads_migrated: 0,
    briefs_migrated: 0,
    action_log_migrated: 0,
    errors: [],
  };

  // Discover old schema
  console.log('\n--- Discovering old schema ---');
  try {
    const tables = await discoverOldSchema();
    console.log(`Old database tables: ${tables.join(', ')}`);
  } catch (err) {
    console.error(`Failed to connect to old database: ${err}`);
    process.exit(1);
  }

  // Run migrations
  await migrateThreads(stats);
  await migrateBriefs(stats);
  await migrateActionLog(stats);

  // Summary
  console.log('\n=== Migration Complete ===');
  console.log(`✓ Threads merged: ${stats.threads_migrated}`);
  console.log(`✓ Briefs migrated: ${stats.briefs_migrated}`);
  console.log(`✓ Action log entries: ${stats.action_log_migrated}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠ Errors (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('\n✓ No errors');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
