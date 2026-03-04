import { NextRequest, NextResponse } from 'next/server';
import anthropic from '@/lib/claude';
import sql from '@/lib/db';
import { getAgent } from '@/lib/agents-config';

export async function POST(req: NextRequest) {
  const { agentKey, message } = await req.json();

  const agent = getAgent(agentKey);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Load current brief
  const [brief] = await sql`
    SELECT * FROM agent_briefs WHERE agent_key = ${agentKey}
  `;

  // Load thread history
  const [threadRow] = await sql`
    SELECT thread_history FROM agent_threads WHERE agent_key = ${agentKey}
  `;
  const history: Array<{ role: string; content: string; timestamp: string }> = threadRow?.thread_history || [];

  // Build system prompt
  const systemPrompt = `You are ${agent.agent_name}, an elite AI sector analyst covering ${agent.sector_name}.

Your coverage: ${agent.tickers.map((t, i) => `${t} (${agent.companies[i]})`).join(', ')}

${brief?.thesis ? `PUBLISHED BRIEF:
Thesis: ${brief.thesis}
Key Drivers: ${JSON.stringify(brief.drivers || [])}
Key Risks: ${JSON.stringify(brief.risks || [])}
Ratings: ${JSON.stringify(brief.ratings || {})}` : 'No published brief yet.'}

You are chatting with OC (portfolio manager). Answer questions concisely using your knowledge and the context above. You can also reference recent news and market developments. Be analytical, precise, and direct — like a top-tier sell-side analyst.`;

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
      messages,
    });

    const replyContent = response.content[0];
    if (replyContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }
    const reply = replyContent.text;

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
