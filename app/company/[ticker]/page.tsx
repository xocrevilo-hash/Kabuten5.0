import sql from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ ticker: string }>;
}

interface Finding {
  id: number;
  classification: string;
  headline: string;
  detail: string;
  swept_at: string;
  catalyst_update: string | null;
  earnings_summary: string | null;
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker);

  const [company] = await sql`
    SELECT c.*, sa.agent_name, sa.colour
    FROM companies c
    LEFT JOIN sector_agents sa ON c.agent_key = sa.agent_key
    WHERE c.ticker = ${decodedTicker}
    LIMIT 1
  `;

  if (!company) {
    notFound();
  }

  // Get recent findings for this company
  const findingsRaw = await sql`
    SELECT * FROM action_log 
    WHERE company_ticker = ${decodedTicker}
    ORDER BY swept_at DESC 
    LIMIT 10
  `;
  const findings = findingsRaw as unknown as Finding[];

  // Get current rating from agent brief
  let rating = '—';
  if (company.agent_key) {
    const [brief] = await sql`
      SELECT ratings FROM agent_briefs WHERE agent_key = ${company.agent_key}
    `;
    if (brief?.ratings && (brief.ratings as Record<string, string>)[decodedTicker]) {
      rating = (brief.ratings as Record<string, string>)[decodedTicker];
    }
  }

  const ratingColors: Record<string, string> = {
    BUY: 'bg-emerald-100 text-emerald-700',
    NEUTRAL: 'bg-gray-100 text-gray-600',
    SELL: 'bg-red-100 text-red-600',
  };

  const classIcons: Record<string, string> = {
    Material: '🔴',
    Incremental: '🟡',
    'No Change': '⚪',
  };

  // Build TradingView symbol from ticker + exchange suffix
  let tvSymbol = decodedTicker;
  if (decodedTicker.endsWith('.T')) {
    tvSymbol = `TSE:${decodedTicker.replace('.T', '')}`;
  } else if (decodedTicker.endsWith('.TW')) {
    tvSymbol = `TWSE:${decodedTicker.replace('.TW', '')}`;
  } else if (decodedTicker.endsWith('.KS')) {
    tvSymbol = `KRX:${decodedTicker.replace('.KS', '')}`;
  } else if (decodedTicker.endsWith('.HK')) {
    tvSymbol = `HKEX:${decodedTicker.replace('.HK', '')}`;
  } else if (decodedTicker.endsWith('.NS')) {
    tvSymbol = `NSE:${decodedTicker.replace('.NS', '')}`;
  } else if (decodedTicker.endsWith('.SS')) {
    tvSymbol = `SSE:${decodedTicker.replace('.SS', '')}`;
  } else if (decodedTicker.endsWith('.SZ')) {
    tvSymbol = `SZSE:${decodedTicker.replace('.SZ', '')}`;
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm font-mono text-gray-400">
        <Link href="/" className="hover:text-gray-600">Coverage</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{String(company.name)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 mb-4 border border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{String(company.name)}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono font-bold text-gray-700">{String(company.ticker)}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{String(company.exchange ?? '')}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{String(company.country ?? '')}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{String(company.sector ?? '')}</span>
            </div>
          </div>
          <div className="text-right">
            {rating !== '—' && (
              <span className={`px-3 py-1 rounded-full text-sm font-mono font-bold ${ratingColors[rating] || 'bg-gray-100 text-gray-600'}`}>
                {rating}
              </span>
            )}
            {company.agent_name && (
              <p className="text-xs font-mono text-gray-400 mt-1">
                Covered by{' '}
                <Link href="/sectors" className="font-semibold text-gray-600 hover:underline">
                  {String(company.agent_name)}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TradingView chart */}
      <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden" style={{ height: 400 }}>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=D&theme=light&style=1&locale=en&toolbar_bg=ffffff&hide_top_toolbar=0&save_image=0`}
          width="100%"
          height="400"
          frameBorder={0}
          allowTransparency={true}
          scrolling="no"
          title={`${String(company.name)} chart`}
        />
      </div>

      {/* Recent findings */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h2 className="font-mono font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">
          Recent Sweep Findings
        </h2>
        {findings.length === 0 ? (
          <p className="text-gray-400 text-sm font-mono">No sweep findings yet for {decodedTicker}</p>
        ) : (
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.id} className="border-b border-gray-50 pb-3 last:border-0">
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{classIcons[f.classification] || '⚪'}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{f.headline}</p>
                    {f.detail && (
                      <p className="text-xs text-gray-500 mt-0.5">{f.detail}</p>
                    )}
                    {f.catalyst_update && (
                      <p className="text-xs text-blue-500 mt-0.5">Catalyst: {f.catalyst_update}</p>
                    )}
                    {f.earnings_summary && (
                      <p className="text-xs text-emerald-600 mt-0.5">Earnings: {f.earnings_summary}</p>
                    )}
                    <p className="text-xs font-mono text-gray-400 mt-1">
                      {new Date(f.swept_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
