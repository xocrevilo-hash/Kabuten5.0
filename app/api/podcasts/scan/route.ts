import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic();

const PODCASTS: Record<string, string> = {
  'A16Z Show':                'a16z-podcast',
  'All-In':                  'all-in-with-chamath-jason-sacks-friedberg',
  'BG2 Pod':                 'bg2-pod',
  'Big Technology Podcast':  'big-technology-podcast',
  'Bloomberg Tech':          'bloomberg-technology',
  'Hard Fork':               'hard-fork',
  'No Priors':               'no-priors',
  'Odd Lots':                'odd-lots',
  'Semi-Doped':              'semi-doped',
  'The Circuit':             'the-circuit',
};

function isAuthorized(request: Request): boolean {
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

async function scanPodcast(podcastName: string, slug: string): Promise<{
  episodeTitle: string;
  episodeDate: string;
  bullets: Array<{ text: string; tag: string }>;
  tickers: string[];
  sourceUrl: string;
  hasRelevantContent: boolean;
}> {
  const prompt = `You are a financial research assistant scanning podcasts for investment-relevant content.

Task: Find the most recent episode of "${podcastName}" and extract any discussion about: semiconductors, AI infrastructure, chip supply chains, NVDA, TSMC, ASML, HBM, hyperscaler capex, export controls, or technology investment themes.

Search strategy (use at most 5 searches total — stop as soon as you have enough):
1. Search: "${podcastName}" latest episode 2026
2. If needed, try podscripts.co/podcasts/${slug} or metacast.app/podcast/${slug} for a transcript
3. If needed, search X.com or Apple Podcasts for episode summaries

If you find relevant content, summarise in up to 5 bullet points. Each bullet must be a concrete investment insight with specific data points, named companies, or concrete claims — no generic statements.

For each bullet, assign the single most relevant tag from this list: AI, SEMIS, MACRO, CLOUD, EV, DEFENCE, OTHER.

Extract any stock tickers mentioned (e.g. NVDA, 2330.TW, ASML).

Respond ONLY with valid JSON (no markdown fences, no preamble):
{
  "episodeTitle": "exact episode title",
  "episodeDate": "YYYY-MM-DD",
  "bullets": [
    { "text": "bullet text", "tag": "AI" },
    { "text": "bullet text", "tag": "SEMIS" }
  ],
  "tickers": ["NVDA"],
  "sourceUrl": "https://...",
  "hasRelevantContent": true
}

If the latest episode has no relevant content OR you cannot find episode details within your search budget, return hasRelevantContent: false with empty arrays. Do not keep searching if you've used 3+ searches without finding content.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }] as never,
    messages: [{ role: 'user', content: prompt }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlocks: string[] = (response.content as any[])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => String(b.text ?? '').trim());

  let jsonText = '';
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    let candidate = textBlocks[i];
    if (candidate.startsWith('```')) {
      candidate = candidate.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    if (candidate.startsWith('{')) {
      jsonText = candidate;
      break;
    }
  }

  if (!jsonText) {
    const allText = textBlocks.join('\n');
    const match = allText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }

  if (!jsonText) {
    throw new Error(`No JSON found in Claude response. Blocks: ${textBlocks.map(t => t.substring(0, 100)).join(' | ')}`);
  }

  return JSON.parse(jsonText);
}

function normalizeDate(d: string | undefined | null): string | null {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;          // YYYY-MM-DD ✓
  if (/^\d{4}-\d{2}$/.test(d)) return d + '-01';         // YYYY-MM → first of month
  if (/^\d{4}$/.test(d)) return d + '-01-01';            // YYYY → Jan 1
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let show: string;
  try {
    const body = await request.json();
    show = body.show;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON with { show: "Show Name" }' }, { status: 400 });
  }

  const slug = PODCASTS[show];
  if (!slug) {
    return NextResponse.json({ error: `Unknown show: ${show}` }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await scanPodcast(show, slug);

    if (result.hasRelevantContent) {
      await sql`
        INSERT INTO podcast_summaries
          (podcast_name, episode_title, episode_date, bullets, tickers, source_url, has_relevant_content, scanned_at)
        VALUES (
          ${show},
          ${result.episodeTitle},
          ${normalizeDate(result.episodeDate)},
          ${JSON.stringify(result.bullets)},
          ${result.tickers},
          ${result.sourceUrl},
          true,
          NOW()
        )
        ON CONFLICT (podcast_name, episode_title)
        DO UPDATE SET
          bullets = EXCLUDED.bullets,
          tickers = EXCLUDED.tickers,
          source_url = EXCLUDED.source_url,
          scanned_at = NOW()
      `;
    }

    return NextResponse.json({ show, ...result });
  } catch (err) {
    console.error(`[Podcast Scanner] Error scanning ${show}:`, err);
    return NextResponse.json({ show, error: String(err), hasRelevantContent: false }, { status: 500 });
  }
}
