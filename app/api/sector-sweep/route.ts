import { NextRequest, NextResponse } from 'next/server';
import anthropic from '@/lib/claude';
import sql from '@/lib/db';
import { getAgent, AGENTS } from '@/lib/agents-config';

// FORGE batches (17 companies → 3 batches)
const FORGE_BATCHES = [
  ['688082.SS', '6857.T', 'AMAT', '3711.TW', 'ASML', '6146.T'],
  ['6361.T', '7741.T', 'KLAC', '6525.T', 'LRCX', '6920.T'],
  ['6323.T', '7735.T', '8035.T', '7729.T', '002371.SZ'],
];

async function runSweep(agentKey: string, tickers: string[], companies: string[]): Promise<{
  companies: Array<{
    ticker: string;
    classification: string;
    headline: string;
    detail: string;
    catalyst_update: string | null;
    earnings_summary: string | null;
  }>;
  cross_company_signals: string[];
  brief_changed: boolean;
  proposed_brief?: {
    thesis: string;
    drivers: string[];
    risks: string[];
    ratings: Record<string, string>;
    reasoning: string;
  };
}> {
  const agent = getAgent(agentKey);
  if (!agent) throw new Error(`Agent not found: ${agentKey}`);

  // Load current brief
  const [brief] = await sql`
    SELECT * FROM agent_briefs WHERE agent_key = ${agentKey}
  `;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const coverageList = tickers.map((t, i) => `${t} (${companies[i]})`).join(', ');

  const priorView = brief?.thesis
    ? `Thesis: ${brief.thesis}
Top Driver: ${Array.isArray(brief.drivers) ? brief.drivers[0] : 'None'}
Top Risk: ${Array.isArray(brief.risks) ? brief.risks[0] : 'None'}
Current Ratings: ${JSON.stringify(brief.ratings || {})}`
    : 'No prior view established yet. This is the first sweep.';

  const sweepPrompt = `You are ${agent.agent_name}, an elite AI sector analyst covering ${agent.sector_name}.

Coverage universe: ${coverageList}
Today: ${today}

PRIOR VIEW (evolve — don't discard):
${priorView}

═══════════════════════════════════════════
ANALYTICAL FRAMEWORK
═══════════════════════════════════════════

For each company in your coverage, apply the following structured analysis:

1. EARNINGS ANALYSIS (if earnings were reported in last 7 days):
   - Revenue vs consensus estimate (beat/miss/inline, magnitude)
   - EPS vs consensus estimate
   - Guidance: raised / maintained / lowered vs prior
   - Key metric surprises (margins, segment mix, backlog, bookings)
   - Management commentary tone and forward signalling

2. CATALYST TRACKING:
   - Upcoming catalysts in next 30 days (earnings dates, product launches, regulatory decisions)
   - Catalyst resolution: any prior catalyst that has now played out?

3. VALUATION CONTEXT:
   - Current valuation vs recent history
   - Any meaningful re-rating or de-rating since last sweep

4. CROSS-COMPANY SIGNAL DETECTION:
   - Supply chain read-throughs
   - Shared macro exposures (tariffs, FX, rates, AI capex cycle)
   - Competitive dynamics

5. IDEA GENERATION:
   - Flag any company showing inflecting fundamentals, consensus too low/high, or valuation dislocation

INSTRUCTIONS:
1. Search for recent news, earnings, price action, and analyst commentary for each company in your coverage.
2. Apply the analytical framework above.
3. For each company, classify as: Material, Incremental, or No Change.
4. Compare findings against the PRIOR VIEW above.
5. If findings warrant changes to thesis, drivers, risks, or ratings, propose updates with reasoning.

OUTPUT (JSON only, no other text):
{
  "companies": [
    {
      "ticker": "NVDA",
      "classification": "Material",
      "headline": "...",
      "detail": "...",
      "catalyst_update": "...",
      "earnings_summary": null
    }
  ],
  "cross_company_signals": ["signal 1", "signal 2"],
  "brief_changed": true,
  "proposed_brief": {
    "thesis": "3-5 sentence updated thesis",
    "drivers": ["driver 1", "driver 2", "driver 3"],
    "risks": ["risk 1", "risk 2", "risk 3"],
    "ratings": {"NVDA": "BUY", "AMD": "NEUTRAL"},
    "reasoning": "1-2 sentences explaining what changed and why"
  }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }] as any,
    system: `You are ${agent.agent_name}, an elite AI sector analyst. Always respond with valid JSON only in the format specified. No markdown, no code blocks, just raw JSON.`,
    messages: [{ role: 'user', content: sweepPrompt }],
  });

  // Extract text content from potentially multi-block response
  let jsonText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      jsonText += block.text;
    }
  }

  // Clean up JSON (remove markdown code blocks if present)
  jsonText = jsonText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonText);
}

export async function POST(req: NextRequest) {
  // Auth check
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const agentParam = searchParams.get('agent')?.toUpperCase();

  if (!agentParam) {
    return NextResponse.json({ error: 'Missing agent parameter' }, { status: 400 });
  }

  const agentKey = agentParam.toLowerCase();
  const agent = getAgent(agentKey);

  if (!agent) {
    return NextResponse.json({ error: `Unknown agent: ${agentParam}` }, { status: 400 });
  }

  try {
    let allCompanyResults: Array<{
      ticker: string;
      classification: string;
      headline: string;
      detail: string;
      catalyst_update: string | null;
      earnings_summary: string | null;
    }> = [];
    let allSignals: string[] = [];
    let latestBriefChanged = false;
    let latestProposedBrief: {
      thesis: string;
      drivers: string[];
      risks: string[];
      ratings: Record<string, string>;
      reasoning: string;
    } | undefined;

    if (agentKey === 'forge') {
      // FORGE: batch into 3 groups
      for (let i = 0; i < FORGE_BATCHES.length; i++) {
        const batchTickers = FORGE_BATCHES[i];
        const batchCompanies = batchTickers.map(t => {
          const idx = agent.tickers.indexOf(t);
          return idx >= 0 ? agent.companies[idx] : t;
        });

        const result = await runSweep(agentKey, batchTickers, batchCompanies);
        allCompanyResults = [...allCompanyResults, ...result.companies];
        allSignals = [...allSignals, ...result.cross_company_signals];
        if (result.brief_changed) {
          latestBriefChanged = true;
          latestProposedBrief = result.proposed_brief;
        }
      }
    } else {
      // Standard single-pass sweep
      const result = await runSweep(agentKey, agent.tickers, agent.companies);
      allCompanyResults = result.companies;
      allSignals = result.cross_company_signals;
      latestBriefChanged = result.brief_changed;
      latestProposedBrief = result.proposed_brief;
    }

    // Write findings to action_log
    const sweepTime = new Date().toISOString();
    for (const company of allCompanyResults) {
      await sql`
        INSERT INTO action_log (agent_key, company_ticker, classification, headline, detail, catalyst_update, earnings_summary, swept_at)
        VALUES (${agentKey}, ${company.ticker}, ${company.classification}, ${company.headline}, ${company.detail}, ${company.catalyst_update || null}, ${company.earnings_summary || null}, ${sweepTime})
      `;
    }

    // Write cross-company signals
    if (allSignals.length > 0) {
      const relatedTickers = allCompanyResults.map(c => c.ticker);
      await sql`
        INSERT INTO cross_company_signals (agent_key, signal, related_tickers, swept_at)
        SELECT ${agentKey}, signal, ${relatedTickers}::text[], ${sweepTime}
        FROM unnest(${allSignals}::text[]) AS signal
      `;
    }

    // Write brief proposal if changed
    if (latestBriefChanged && latestProposedBrief) {
      // Cancel any existing pending proposals for this agent
      await sql`
        UPDATE brief_proposals SET status = 'superseded', resolved_at = NOW()
        WHERE agent_key = ${agentKey} AND status = 'pending'
      `;

      await sql`
        INSERT INTO brief_proposals (agent_key, proposed_thesis, proposed_drivers, proposed_risks, proposed_ratings, reasoning, status, proposed_at)
        VALUES (
          ${agentKey},
          ${latestProposedBrief.thesis},
          ${JSON.stringify(latestProposedBrief.drivers)}::jsonb,
          ${JSON.stringify(latestProposedBrief.risks)}::jsonb,
          ${JSON.stringify(latestProposedBrief.ratings)}::jsonb,
          ${latestProposedBrief.reasoning},
          'pending',
          ${sweepTime}
        )
      `;
    }

    // Compose sweep card message and append to agent thread
    const material = allCompanyResults.filter(c => c.classification === 'Material').length;
    const incremental = allCompanyResults.filter(c => c.classification === 'Incremental').length;
    const noChange = allCompanyResults.filter(c => c.classification === 'No Change').length;

    const sweepMessage = {
      role: 'sweep',
      content: `Daily Sweep — ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}: ${material} Material · ${incremental} Incremental · ${noChange} No Change`,
      timestamp: sweepTime,
      type: 'sweep',
      sweep_data: {
        findings: allCompanyResults.map(c => ({
          company_ticker: c.ticker,
          classification: c.classification,
          headline: c.headline,
        })),
        signals: allSignals.map(s => ({ signal: s })),
      },
    };

    // Load and update thread
    const [threadRow] = await sql`
      SELECT thread_history FROM agent_threads WHERE agent_key = ${agentKey}
    `;
    const history = threadRow?.thread_history || [];
    const updatedHistory = [...history, sweepMessage];

    await sql`
      UPDATE agent_threads 
      SET thread_history = ${JSON.stringify(updatedHistory)}::jsonb
      WHERE agent_key = ${agentKey}
    `;

    return NextResponse.json({
      success: true,
      agent: agentParam,
      swept_at: sweepTime,
      summary: {
        companies: allCompanyResults.length,
        material,
        incremental,
        no_change: noChange,
        signals: allSignals.length,
        brief_changed: latestBriefChanged,
      },
    });
  } catch (error) {
    console.error('Sweep error:', error);
    return NextResponse.json({
      error: 'Sweep failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Also allow GET for Vercel cron (cron hits GET by default)
export async function GET(req: NextRequest) {
  // For Vercel cron, check the Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also check x-cron-secret for manual triggers
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Reuse POST logic by constructing a fake POST
  return POST(req);
}
