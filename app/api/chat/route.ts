import { NextRequest, NextResponse } from 'next/server';
import anthropic from '@/lib/claude';
import sql from '@/lib/db';
import { getAgent } from '@/lib/agents-config';

function isMobileAuthorized(req: NextRequest): boolean {
  return req.headers.get('authorization') === 'Bearer fingerthumb';
}

export async function POST(req: NextRequest) {
  if (!isMobileAuthorized(req)) {
    const cookie = req.cookies.get('kabuten-auth');
    if (cookie?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const { agentKey, message } = await req.json();

  const agent = getAgent(agentKey);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Load thread history
  const [threadRow] = await sql`
    SELECT thread_history FROM agent_threads WHERE agent_key = ${agentKey}
  `;
  const history: Array<{ role: string; content: string; timestamp: string }> = threadRow?.thread_history || [];

  // Build system prompt — special case for SHRINK
  let systemPrompt: string;

  if (agentKey === 'shrink') {
    systemPrompt = `You are SHRINK, an investment philosophy sparring partner.

You embody the combined wisdom of the great investors: Warren Buffett, Benjamin Graham, Peter Lynch, George Soros, and Stanley Druckenmiller. You help portfolio managers stress-test their thinking, challenge assumptions, and sharpen investment discipline.

You do not cover a specific sector or universe of stocks. Instead, you engage in deep discussions about:
- Investment philosophy and mental models
- Position sizing and portfolio construction
- Risk management and drawdown psychology
- Entry and exit discipline
- Sector rotation and macro context
- Behavioural finance and cognitive biases
- Conviction vs. diversification trade-offs

Draw on the specific frameworks of each investor when relevant:
- Buffett / Graham: moat analysis, margin of safety, intrinsic value, Mr. Market metaphor, owner earnings
- Lynch: growth at a reasonable price, tenbaggers, category identification, invest in what you know
- Soros: reflexivity theory, boom-bust cycles, hypothesis formation and testing against the market
- Druckenmiller: macro thematic positioning, concentration in high-conviction ideas, asymmetric risk/reward

Be Socratic. Challenge the portfolio manager's thinking. Ask probing questions. Push back on lazy reasoning. Demand rigour. Be direct and intellectually uncompromising — like a brilliant investing mentor who doesn't suffer mediocre analysis gladly.

You are chatting with OC (portfolio manager).`;
  } else {
    // Load current brief + latest earnings transcripts for sector agents
    const [brief] = await sql`
      SELECT * FROM agent_briefs WHERE agent_key = ${agentKey}
    `;

    const transcripts = await sql`
      SELECT DISTINCT ON (ticker)
        ticker, fiscal_period, report_date,
        vs_consensus, guidance, management_tone, key_themes, summary
      FROM earnings_transcripts
      WHERE agent_key = ${agentKey}
      ORDER BY ticker, report_date DESC NULLS LAST
    `;

    interface TranscriptRow {
      ticker: string;
      fiscal_period: string;
      report_date: string | null;
      vs_consensus: string | null;
      guidance: string | null;
      management_tone: string | null;
      key_themes: string[] | null;
      summary: string | null;
    }

    const transcriptContext = (transcripts as TranscriptRow[]).length > 0
      ? `\nLATEST EARNINGS TRANSCRIPTS (${(transcripts as TranscriptRow[]).length} companies):\n` +
        (transcripts as TranscriptRow[]).map((t) =>
          `\n[${t.ticker} — ${t.fiscal_period}${t.report_date ? ` (${t.report_date})` : ''}]` +
          (t.management_tone ? `\nTone: ${t.management_tone}` : '') +
          (t.vs_consensus   ? `\nResult: ${t.vs_consensus}` : '') +
          (t.guidance       ? `\nGuidance: ${t.guidance}` : '') +
          (t.key_themes?.length ? `\nThemes: ${t.key_themes.join(' · ')}` : '') +
          (t.summary        ? `\nSummary: ${t.summary}` : '')
        ).join('\n')
      : '';

    systemPrompt = `You are ${agent.agent_name}, an elite AI sector analyst covering ${agent.sector_name}.

Your coverage: ${agent.tickers.map((t, i) => `${t} (${agent.companies[i]})`).join(', ')}

${brief?.thesis ? `PUBLISHED BRIEF:
Thesis: ${brief.thesis}
Key Drivers: ${JSON.stringify(brief.drivers || [])}
Key Risks: ${JSON.stringify(brief.risks || [])}
Ratings: ${JSON.stringify(brief.ratings || {})}` : 'No published brief yet.'}
${transcriptContext}
You are chatting with OC (portfolio manager). Answer questions concisely using your knowledge and the context above. When asked about a company's earnings, reference the transcript summaries above. You can also use web search for the latest news. Be analytical, precise, and direct — like a top-tier sell-side analyst.`;
  }

  // Build messages array (last 20 messages for context)
  const recentHistory = history.slice(-20);
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...recentHistory
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    { role: 'user', content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 10 }] as any,
      messages,
    });

    // Extract text from potentially multi-block response (web_search adds tool_result blocks)
    const reply = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    if (!reply) {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    // Append to thread history
    const newHistory = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];

    await sql`
      UPDATE agent_threads
      SET thread_history = ${JSON.stringify(newHistory)}::jsonb
      WHERE agent_key = ${agentKey}
    `;

    return NextResponse.json({ reply, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
