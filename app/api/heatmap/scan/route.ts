import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';

const HEATMAP_KEYWORDS = [
  'NVDA', 'TSMC', 'ASML', 'AMD', 'Broadcom',
  'HBM memory', 'CoWoS packaging', 'AI inference', 'Blackwell GPU',
  'hyperscaler capex', 'data center buildout',
  'semiconductor export controls', 'CHIPS Act',
  'Tokyo Electron', 'Advantest', 'Lasertec',
  'Samsung HBM', 'SK Hynix HBM', 'Micron earnings',
  'CATL battery', 'BYD EV', 'Tesla demand',
  'SoftBank Vision Fund', 'Alibaba earnings', 'Tencent earnings',
  'iron ore price', 'copper price', 'lithium price',
  'BOJ rate hike', 'JPY dollar', 'China stimulus',
  'tariffs semiconductors', 'US China tech war',
  'PCB supply chain', 'power grid AI', 'transformer shortage',
  'networking optics', 'Marvell earnings', 'Arista Networks',
  'Korea defence export',
];

const BATCH_SIZE = 8;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  return cookies['kabuten-auth'] === 'true';
}

async function scoreBatch(
  client: Anthropic,
  keywords: string[],
): Promise<Array<{ keyword: string; heat_score: number; note: string }>> {
  const prompt = `You are scanning X.com for social media heat on the following investment topics. For each keyword, search X.com using site:x.com queries and assess:
- How many relevant results appear?
- How recent are they (hours vs days vs weeks)?
- Is there any spike in activity vs background noise?

Return ONLY a valid JSON array with no preamble:
[
  { "keyword": "...", "heat_score": 0-100, "note": "one-line reason" },
  ...
]

Heat score guide: 0-25 cool (little activity), 26-50 moderate, 51-75 elevated, 76-100 very hot/spiking.

Keywords to scan (score ALL of them):
${keywords.join(', ')}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 8 }] as never,
    messages: [{ role: 'user', content: prompt }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlocks = (response.content as any[])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => String(b.text ?? '').trim());

  let jsonText = '';
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    let candidate = textBlocks[i];
    if (candidate.startsWith('```')) {
      candidate = candidate.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    if (candidate.startsWith('[')) {
      jsonText = candidate;
      break;
    }
  }

  if (!jsonText) {
    const allText = textBlocks.join('\n');
    const match = allText.match(/\[[\s\S]*\]/);
    if (match) jsonText = match[0];
  }

  if (!jsonText) throw new Error('No JSON array found in Claude response');
  return JSON.parse(jsonText);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = new Anthropic();
    const sql = neon(process.env.DATABASE_URL!);

    // Split keywords into batches of 8
    const batches: string[][] = [];
    for (let i = 0; i < HEATMAP_KEYWORDS.length; i += BATCH_SIZE) {
      batches.push(HEATMAP_KEYWORDS.slice(i, i + BATCH_SIZE));
    }

    const allResults: Array<{ keyword: string; heat_score: number; note: string }> = [];

    for (const batch of batches) {
      const batchResults = await scoreBatch(client, batch);
      allResults.push(...batchResults);
    }

    // Persist to heatmap_scans
    const scannedAt = new Date().toISOString();
    for (const r of allResults) {
      await sql`
        INSERT INTO heatmap_scans (keyword, heat_score, scanned_at)
        VALUES (${r.keyword}, ${r.heat_score}, ${scannedAt})
      `;
    }

    return NextResponse.json({
      ok: true,
      scanned: allResults.length,
      results: allResults,
    });
  } catch (err) {
    console.error('Heatmap scan error:', err);
    return NextResponse.json({ error: 'Scan failed', details: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ keywords: HEATMAP_KEYWORDS });
}
