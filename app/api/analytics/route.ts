import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const ticker = searchParams.get('ticker');

  if (!endpoint || !ticker) {
    return NextResponse.json({ error: 'endpoint and ticker are required' }, { status: 400 });
  }

  const apiKey = process.env.FINANCIAL_DATASETS_API_KEY;

  try {
    // Forward all search params except 'endpoint'
    const forwardParams = new URLSearchParams();
    forwardParams.set('ticker', ticker);
    searchParams.forEach((val, key) => {
      if (key !== 'endpoint' && key !== 'ticker') forwardParams.set(key, val);
    });

    // Trailing slash required to avoid 301 redirect
    const fdUrl = `https://api.financialdatasets.ai/${endpoint}/?${forwardParams.toString()}`;
    const headers: Record<string, string> = {};
    if (apiKey) headers['X-API-KEY'] = apiKey;

    const res = await fetch(fdUrl, { headers });
    const data = await res.json();

    // If upstream says API key required, signal mock mode
    if (data?.error === 'Missing API key') {
      return NextResponse.json({ mock: true, endpoint, ticker });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[analytics proxy] error:', err);
    return NextResponse.json({ error: 'Upstream request failed', details: String(err) }, { status: 502 });
  }
}
