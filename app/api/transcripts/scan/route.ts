import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';
import { AGENTS, getAgent } from '@/lib/agents-config';

// Ordered list of agents that participate in the sweep chain
const SWEEP_AGENTS = AGENTS
  .filter((a) => a.hasSweep && a.tickers.length > 0)
  .map((a) => a.agent_key);

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const xHeader = req.headers.get('x-cron-secret');
  const auth = req.headers.get('authorization');
  return xHeader === secret || auth === `Bearer ${secret}`;
}

// Fire-and-forget call to the next agent in the chain
function chainToNext(currentKey: string, baseUrl: string) {
  const idx = SWEEP_AGENTS.indexOf(currentKey);
  if (idx === -1 || idx === SWEEP_AGENTS.length - 1) return;
  const nextKey = SWEEP_AGENTS[idx + 1].toUpperCase();
  const url = `${baseUrl}/api/transcripts/scan?agent=${nextKey}`;
  fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
  }).catch(() => {/* best-effort */});
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const agentParam = (searchParams.get('agent') ?? '').toLowerCase();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kabuten50.vercel.app';

  if (!agentParam) {
    return NextResponse.json({ error: 'No agent specified. Use ?agent=APEX' }, { status: 400 });
  }

  const agent = getAgent(agentParam);

  // Skip agents with no tickers and chain forward
  if (!agent || !agent.hasSweep || agent.tickers.length === 0) {
    chainToNext(agentParam, baseUrl);
    return NextResponse.json({ skipped: true, agent: agentParam });
  }

  const client = new Anthropic();
  const results: Array<{ ticker: string; company: string; success: boolean; period?: string; error?: string }> = [];

  for (let i = 0; i < agent.tickers.length; i++) {
    const ticker = agent.tickers[i];
    const company = agent.companies[i];

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [
          { type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 },
        ] as Parameters<typeof client.messages.create>[0]['tools'],
        messages: [
          {
            role: 'user',
            content: `Search for the most recent earnings call transcript or earnings results for ${company} (ticker: ${ticker}).

Find the latest quarterly earnings call from the last 6 months. Look for sources like Seeking Alpha, Motley Fool, the company IR page, or major financial news sites.

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "fiscal_period": "Q3 FY2025",
  "report_date": "2025-01-24",
  "revenue_actual": 78.5,
  "revenue_unit": "B",
  "eps_actual": 0.89,
  "vs_consensus": "Revenue beat by 3.2%, EPS in-line with consensus",
  "guidance": "Q4 revenue guided $82-84B vs street at $81B — above consensus",
  "management_tone": "Bullish",
  "key_themes": ["AI infrastructure demand accelerating", "Margin expansion on track", "China headwinds manageable"],
  "summary": "300-400 word analytical summary covering: (1) headline results vs consensus, (2) key segment performance, (3) guidance and outlook, (4) management commentary themes, (5) key risks or concerns raised",
  "source_url": "https://..."
}

Use "Bullish", "Neutral", or "Cautious" for management_tone.
If no transcript or results are found from the last 6 months, return: {"fiscal_period": "Not found", "summary": "No recent earnings data found for ${company} (${ticker})"}`,
          },
        ],
      });

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');

      // Extract JSON object from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        results.push({ ticker, company, success: false, error: 'No JSON in response' });
        continue;
      }

      const data = JSON.parse(jsonMatch[0]) as {
        fiscal_period?: string;
        report_date?: string;
        revenue_actual?: number;
        revenue_unit?: string;
        eps_actual?: number;
        vs_consensus?: string;
        guidance?: string;
        management_tone?: string;
        key_themes?: string[];
        summary?: string;
        source_url?: string;
      };

      const period = data.fiscal_period || 'Latest';

      await sql`
        INSERT INTO earnings_transcripts (
          ticker, agent_key, fiscal_period, report_date,
          revenue_actual, revenue_unit, eps_actual,
          vs_consensus, guidance, management_tone,
          key_themes, summary, source_url, scanned_at
        ) VALUES (
          ${ticker},
          ${agent.agent_key},
          ${period},
          ${data.report_date ?? null},
          ${data.revenue_actual ?? null},
          ${data.revenue_unit ?? null},
          ${data.eps_actual ?? null},
          ${data.vs_consensus ?? null},
          ${data.guidance ?? null},
          ${data.management_tone ?? null},
          ${data.key_themes ?? []},
          ${data.summary ?? null},
          ${data.source_url ?? null},
          NOW()
        )
        ON CONFLICT (ticker, fiscal_period) DO UPDATE SET
          report_date     = EXCLUDED.report_date,
          revenue_actual  = EXCLUDED.revenue_actual,
          revenue_unit    = EXCLUDED.revenue_unit,
          eps_actual      = EXCLUDED.eps_actual,
          vs_consensus    = EXCLUDED.vs_consensus,
          guidance        = EXCLUDED.guidance,
          management_tone = EXCLUDED.management_tone,
          key_themes      = EXCLUDED.key_themes,
          summary         = EXCLUDED.summary,
          source_url      = EXCLUDED.source_url,
          scanned_at      = NOW()
      `;

      results.push({ ticker, company, success: true, period });
    } catch (err) {
      results.push({ ticker, company, success: false, error: String(err) });
    }
  }

  // Chain to next agent (fire-and-forget)
  chainToNext(agent.agent_key, baseUrl);

  return NextResponse.json({
    agent: agentParam.toUpperCase(),
    scanned: results.length,
    results,
  });
}
