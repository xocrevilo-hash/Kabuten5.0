import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic();

const PODCASTS = [
  { name: 'A16Z Show',              slug: 'a16z-podcast' },
  { name: 'All-In',                 slug: 'all-in-with-chamath-jason-sacks-friedberg' },
  { name: 'BG2 Pod',                slug: 'bg2-pod' },
  { name: 'Big Technology Podcast', slug: 'big-technology-podcast' },
  { name: 'Bloomberg Tech',         slug: 'bloomberg-technology' },
  { name: 'Hard Fork',              slug: 'hard-fork' },
  { name: 'Odd Lots',               slug: 'odd-lots' },
  { name: 'Semi-Doped',             slug: 'semi-doped' },
  { name: 'The Circuit',            slug: 'the-circuit' },
];

function isAuthorized(request: Request): boolean {
  // Path 1: Vercel cron or server-to-server
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Path 2: Browser session cookie
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  if (cookies['kabuten-auth'] === 'true') return true;

  return false;
}

async function scanPodcast(podcastName: string, slug: string): Promise<{
  episodeTitle: string;
  episodeDate: string;
  bullets: string[];
  tickers: string[];
  sourceUrl: string;
  hasRelevantContent: boolean;
}> {
  const prompt = `You are a financial research assistant scanning podcast transcripts for investment-relevant content.

Task: Find the latest episode of the podcast "${podcastName}" on podscripts.co, then extract all discussion relating to: semiconductors, AI, bottlenecks, chip supply chains, NVDA, TSMC, ASML, HBM, hyperscaler capex, export controls, or any technology investment themes.

Steps:
1. Search the web for: site:podscripts.co "${podcastName}" to find the podcast page and most recent episode.
2. Fetch the transcript of the most recent episode (URL pattern: podscripts.co/podcasts/${slug}/[episode-slug]).
3. Extract all relevant semiconductor/AI/bottleneck content from the transcript.
4. Summarise in EXACTLY 5 bullet points. Each bullet must be a complete investment insight with specific data points, named companies, or concrete claims — no generic statements.
5. Extract all stock tickers mentioned (e.g. NVDA, 2330.TW, ASML, 8035.T, 000660.KS).

Respond ONLY with valid JSON (no markdown fences, no preamble):
{
  "episodeTitle": "exact episode title",
  "episodeDate": "D Mon YYYY e.g. 5 Mar 2026",
  "bullets": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "tickers": ["NVDA", "2330.TW"],
  "sourceUrl": "https://podscripts.co/podcasts/${slug}/[episode-slug]",
  "hasRelevantContent": true
}

If the latest episode has no relevant semiconductor/AI/bottleneck content, set hasRelevantContent to false and use empty arrays.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Same multi-block fix as sector-sweep: web_search responses emit preamble text
  // blocks before the final JSON block — search last-to-first for the JSON block.
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

  // Fallback: extract JSON object from anywhere in combined text
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

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const results = [];
  let withContent = 0;

  for (const podcast of PODCASTS) {
    try {
      const result = await scanPodcast(podcast.name, podcast.slug);

      if (result.hasRelevantContent) {
        await sql`
          INSERT INTO podcast_summaries
            (podcast_name, episode_title, episode_date, bullets, tickers, source_url, has_relevant_content, scanned_at)
          VALUES (
            ${podcast.name},
            ${result.episodeTitle},
            ${result.episodeDate ? new Date(result.episodeDate) : null},
            ${result.bullets},
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
        withContent++;
      }

      results.push({ podcast: podcast.name, ...result });
    } catch (err) {
      console.error(`[Podcast Scanner] Error scanning ${podcast.name}:`, err);
      results.push({ podcast: podcast.name, error: String(err), hasRelevantContent: false });
    }
  }

  return NextResponse.json({ scanned: PODCASTS.length, withContent, results });
}
