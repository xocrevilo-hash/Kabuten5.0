export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import anthropic from '@/lib/claude';
import sql from '@/lib/db';
import { getAgent } from '@/lib/agents-config';

// FORGE_JP batches (10 Japan companies → 2 batches of 5)
const FORGE_JP_BATCHES = [
  ['6857.T', '6146.T', '6361.T', '7741.T', '6525.T'],
  ['6920.T', '6323.T', '7735.T', '8035.T', '7729.T'],
];

async function getBloombergBlock(tickers: string[]): Promise<string> {
  try {
    const rows = await sql`
      SELECT ticker, px_last, fwd_pe, ev_ebitda,
             consensus_eps_fy1, consensus_eps_fy2,
             target_price_mean, target_price_high, target_price_low,
             buy_count, hold_count, sell_count,
             short_interest_ratio, next_earnings_date,
             ytd_return, updated_at
      FROM bloomberg_data
      WHERE ticker = ANY(${tickers}::text[])
      AND updated_at > NOW() - INTERVAL '48 hours'
    `;

    if (rows.length === 0) return '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedRows = rows as any[];
    const staleOrMissing = tickers.filter(t => !typedRows.find(r => r.ticker === t));

    const fmt = (v: number | null | undefined, prefix = '', suffix = '', dec = 1) =>
      v !== null && v !== undefined ? `${prefix}${Number(v).toFixed(dec)}${suffix}` : '—';

    const lines = typedRows.map((r) => {
      const parts = [
        `${r.ticker}: ${fmt(r.px_last, '$')}`,
        r.fwd_pe ? `Fwd P/E ${fmt(r.fwd_pe, '', 'x')}` : null,
        r.ev_ebitda ? `EV/EBITDA ${fmt(r.ev_ebitda, '', 'x')}` : null,
        (r.consensus_eps_fy1 || r.consensus_eps_fy2) ?
          `EPS ${fmt(r.consensus_eps_fy1, '$')} FY1 / ${fmt(r.consensus_eps_fy2, '$')} FY2` : null,
        r.target_price_mean ?
          `TP ${fmt(r.target_price_mean, '$')} (${fmt(r.target_price_high, '$')} hi / ${fmt(r.target_price_low, '$')} lo)` : null,
        (r.buy_count !== null) ?
          `${r.buy_count ?? 0}B/${r.hold_count ?? 0}H/${r.sell_count ?? 0}S` : null,
        r.short_interest_ratio ? `SI ${fmt(r.short_interest_ratio, '', '%')}` : null,
        r.next_earnings_date ? `Earnings: ${r.next_earnings_date}` : null,
        r.ytd_return ? `YTD ${fmt(r.ytd_return, '', '%')}` : null,
      ].filter(Boolean).join(' | ');
      return parts;
    });

    const today = new Date().toISOString().slice(0, 10);
    let block = `\n═══════════════════════════════════════════
BLOOMBERG DATA (as of ${today})
═══════════════════════════════════════════

${lines.join('\n')}`;

    if (staleOrMissing.length > 0) {
      block += `\n\nNote: Bloomberg data unavailable for: ${staleOrMissing.join(', ')}. Rely on web search for these names.`;
    }

    return block + '\n';
  } catch (err) {
    console.error('Bloomberg data fetch error:', err);
    return '';
  }
}

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

  // Fetch Bloomberg data for covered companies
  const bloombergBlock = await getBloombergBlock(tickers);

  const sweepPrompt = `You are ${agent.agent_name}, an elite AI sector analyst covering ${agent.sector_name}.

Coverage universe: ${coverageList}
Today: ${today}

PRIOR VIEW (evolve — don't discard):
${priorView}
${bloombergBlock}
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

SOURCES — priority order for your web searches:
1. X.com (Twitter/X) — highest priority. Search X for each ticker and company name. X surfaces real-time analyst takes, earnings reactions, management commentary, short-seller threads, sector themes, and market intelligence hours or days before it appears in formal news. Search patterns: "$NVDA", "NVDA earnings", "Tokyo Electron analyst", "ASML demand". Look for accounts from: sell-side analysts, fund managers, industry insiders, IR teams, tech journalists. Flag high-signal posts in your findings.
2. Financial news — Reuters, Bloomberg, FT, Nikkei, WSJ, Barron's, The Information
3. Company IR / filings — earnings releases, 8-Ks, TSE disclosures, HKEX filings, ASX announcements
4. Broker research summaries — publicly visible analyst note abstracts or price target changes
5. Industry/trade press — sector-specific publications (e.g. DigiTimes for semis, EV volumes data for SURGE names)

INSTRUCTIONS:
1. Search the above sources — prioritise X.com first for each company, then broaden to news and filings.
2. Apply the analytical framework above — not every section will be relevant for every company on every day.
3. For each company, classify the finding as: Material 🔴, Incremental 🟡, or No Change ⚪ (see thresholds below).
4. Compare your findings against the PRIOR VIEW above.
5. If findings warrant changes to the thesis, drivers, risks, or ratings, propose updates with reasoning. If nothing warrants a change, set "brief_changed" to false.

CLASSIFICATION THRESHOLDS — apply a HIGH hurdle. Default to No Change unless evidence is clear:

No Change ⚪ — New information is consistent with the existing thesis and prior view. Routine news, minor price moves, in-line data, noise. The vast majority of daily findings will be No Change. Default to this unless the evidence clearly meets a higher bar.

Incremental 🟡 — New information that meaningfully updates one element of the thesis but does not alter overall conviction or rating. Examples: a guidance nudge at a conference, an analyst note raising estimates modestly, a minor product announcement, a mildly better/worse print with no thesis implications. To qualify: (a) clearly verified from a credible source, (b) moves the needle on a specific driver or risk already in the thesis, (c) represents a genuine update — not a restatement of what was already known. Do not use Incremental for speculative posts, unverified rumours, or information that merely confirms the current view.

Material 🔴 — New information that meaningfully challenges or confirms the core thesis, warrants a rating reconsideration, or represents a step-change in fundamentals. Examples: a major earnings beat/miss with guidance change, loss of a key customer, transformative M&A, a significant regulatory decision, a structural demand inflection evidenced by hard data. To qualify: (a) primary or highly credible source, (b) directly affects the investment thesis in a way a rational investor would act on, (c) represents a durable signal — not a single-day reaction or social media speculation. This is a high bar.

Bias toward stability. The prior view was set with conviction. New daily information rarely warrants changing it. If you find yourself classifying more than 1–2 companies per sweep as Incremental or Material, recalibrate — you are likely setting the threshold too low.

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
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 10 }] as any,
    system: `You are ${agent.agent_name}, an elite AI sector analyst. Always respond with valid JSON only in the format specified. No markdown, no code blocks, just raw JSON.`,
    messages: [{ role: 'user', content: sweepPrompt }],
  });

  // Extract JSON from Claude's response — when using web_search tools,
  // Claude emits multiple text blocks (preamble text, then final JSON).
  // We must find the text block that contains the JSON, not concatenate all text.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlocks: string[] = (response.content as any[])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => String(b.text ?? '').trim());

  let jsonText = '';

  // Try text blocks from last to first — the JSON is always the final text block
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    let candidate = textBlocks[i];
    // Strip markdown code fences if present
    if (candidate.startsWith('```')) {
      candidate = candidate.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    if (candidate.startsWith('{')) {
      jsonText = candidate;
      break;
    }
  }

  // Fallback: extract JSON object from anywhere in all text blocks combined
  if (!jsonText) {
    const allText = textBlocks.join('\n');
    const match = allText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }

  if (!jsonText) {
    throw new Error(`No JSON found in Claude response. Text blocks: ${textBlocks.map(t => t.substring(0, 100)).join(' | ')}`);
  }

  return JSON.parse(jsonText);
}

function isAuthorized(request: NextRequest): boolean {
  // Path 1: Vercel cron or sweep-all daisy-chain (server-to-server)
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Path 2: Browser session — manual Sweep button click
  // Cookie name is: kabuten-auth=true  (hyphen, not underscore)
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  if (cookies['kabuten-auth'] === 'true') return true;

  return false;
}

async function chainToNext(nextAgent: string | null, cronSecret: string | undefined) {
  if (!nextAgent) return;
  // Await the dispatch synchronously before returning — sweep-all returns in < 1s
  // so this doesn't meaningfully delay the response, but guarantees the request
  // is fully sent before this function exits (no fire-and-forget GC risk).
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';
  try {
    await fetch(`${baseUrl}/api/sweep-all?agent=${nextAgent}`, {
      method: 'GET',
      headers: { 'authorization': `Bearer ${cronSecret ?? ''}` },
    });
    console.log(`[sector-sweep] Chained → ${nextAgent}`);
  } catch (err) {
    console.error(`[sector-sweep] chain → ${nextAgent}:`, err);
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const agentParam = searchParams.get('agent')?.toUpperCase();
  const nextAgent = searchParams.get('next') ?? null;

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

    const batchedAgents: Record<string, string[][]> = {
      forge_jp: FORGE_JP_BATCHES,
    };

    if (agentKey in batchedAgents) {
      // Batched sweep: 10 companies → 2 × 5
      const batches = batchedAgents[agentKey];
      for (let i = 0; i < batches.length; i++) {
        const batchTickers = batches[i];
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

    // Chain to the next agent now that this sweep is complete
    await chainToNext(nextAgent, process.env.CRON_SECRET);

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
    // Still chain to next agent so one failure doesn't kill the whole run
    await chainToNext(nextAgent, process.env.CRON_SECRET);
    return NextResponse.json({
      error: 'Sweep failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Also allow GET for Vercel cron (cron hits GET by default)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST(req);
}
