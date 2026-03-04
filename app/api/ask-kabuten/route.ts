import { NextRequest, NextResponse } from 'next/server';
import anthropic from '@/lib/claude';
import sql from '@/lib/db';
import { AGENTS, getAgent } from '@/lib/agents-config';

// Determine which agents are relevant to the question
async function routeQuestion(question: string): Promise<string[]> {
  const agentSummaries = AGENTS.map(a =>
    `${a.agent_key}: ${a.agent_name} — ${a.sector_name} (covers: ${a.tickers.slice(0, 5).join(', ')}${a.tickers.length > 5 ? '...' : ''})`
  ).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 200,
    system: 'You are a routing agent. Given a question, determine which sector analyst agents are relevant. Return only a JSON array of agent_key strings. Maximum 5 agents. If the question is broad/macro, return all 17 keys.',
    messages: [{
      role: 'user',
      content: `Available agents:\n${agentSummaries}\n\nQuestion: "${question}"\n\nReturn JSON array of relevant agent_keys only.`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  try {
    const keys = JSON.parse(text.trim());
    return Array.isArray(keys) ? keys.filter(k => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // Route to relevant agents
    const relevantKeys = await routeQuestion(question);
    const agentKeys = relevantKeys.length > 0 ? relevantKeys : AGENTS.map(a => a.agent_key);

    // Load briefs for relevant agents
    const briefs = await sql`
      SELECT agent_key, thesis, drivers, risks, ratings, updated_at
      FROM agent_briefs
      WHERE agent_key = ANY(${agentKeys}::text[])
      AND thesis IS NOT NULL
    `;

    // Load recent findings for relevant agents
    const findings = await sql`
      SELECT agent_key, company_ticker, classification, headline, swept_at
      FROM action_log
      WHERE agent_key = ANY(${agentKeys}::text[])
      AND swept_at > NOW() - INTERVAL '7 days'
      ORDER BY swept_at DESC
      LIMIT 30
    `;

    if (briefs.length === 0) {
      return NextResponse.json({
        answer: 'No published briefs available yet. Run sweeps first to build agent knowledge.',
        agents_consulted: [],
        attribution: [],
      });
    }

    // Build context for synthesis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (briefs as any[]).map((b) => {
      const agent = getAgent(b.agent_key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentFindings = (findings as any[])
        .filter((f) => f.agent_key === b.agent_key)
        .slice(0, 5)
        .map((f) => `  - ${f.company_ticker} [${f.classification}]: ${f.headline}`)
        .join('\n');

      return `=== ${agent?.agent_name || String(b.agent_key).toUpperCase()} — ${agent?.sector_name} ===
Thesis: ${b.thesis}
Key Drivers: ${Array.isArray(b.drivers) ? (b.drivers as string[]).join(' | ') : '—'}
Key Risks: ${Array.isArray(b.risks) ? (b.risks as string[]).join(' | ') : '—'}
${agentFindings ? `Recent Findings:\n${agentFindings}` : ''}`;
    }).join('\n\n');

    // Synthesise answer
    const synthesisResponse = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: `You are Kabuten, an AI-powered multi-sector equity research platform. You synthesise insights from multiple sector analyst agents to answer portfolio manager questions. Be concise, specific, and investment-focused. Cite which agent(s) contributed each key insight. Format as clean prose with clear attribution in parentheses like (NOVA, FORGE).`,
      messages: [{
        role: 'user',
        content: `Question from portfolio manager: "${question}"\n\nAgent Context:\n${context}\n\nProvide a synthesised, investment-actionable answer.`,
      }],
    });

    const answer = synthesisResponse.content.find(b => b.type === 'text')?.text || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentsConsulted = (briefs as any[]).map((b) => {
      const agent = getAgent(String(b.agent_key));
      return {
        key: b.agent_key,
        name: agent?.agent_name || String(b.agent_key).toUpperCase(),
        sector: agent?.sector_name || '',
      };
    });

    return NextResponse.json({
      answer,
      agents_consulted: agentsConsulted,
      question,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Ask Kabuten error:', err);
    return NextResponse.json({
      error: 'Failed to synthesise answer',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
