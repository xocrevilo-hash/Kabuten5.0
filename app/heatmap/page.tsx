'use client';

import { useState, useEffect, useCallback } from 'react';

const KEYWORDS = [
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

interface ScanResult {
  keyword: string;
  view_count?: number;
  heat_score: number;
  scanned_at: string;
  avg_views?: number;
}

function heatColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 85) return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' };
  if (score >= 70) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' };
  if (score >= 55) return { bg: 'bg-amber-400', text: 'text-gray-900', border: 'border-amber-500' };
  if (score >= 40) return { bg: 'bg-yellow-300', text: 'text-gray-900', border: 'border-yellow-400' };
  if (score >= 25) return { bg: 'bg-lime-300', text: 'text-gray-900', border: 'border-lime-400' };
  if (score >= 10) return { bg: 'bg-cyan-200', text: 'text-gray-900', border: 'border-cyan-300' };
  return { bg: 'bg-blue-100', text: 'text-gray-700', border: 'border-blue-200' };
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function HeatmapPage() {
  const [scans, setScans] = useState<Record<string, ScanResult>>({});
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/heatmap');
      const data = await res.json();
      const map: Record<string, ScanResult> = {};
      for (const s of data.scans || []) {
        map[s.keyword] = { ...s, heat_score: Number(s.heat_score) };
      }
      setScans(map);
      setLastScan(data.lastScan);
    } catch {
      console.error('Failed to load heatmap data');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    setError('');

    try {
      const res = await fetch('/api/heatmap/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Scan failed');
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const sortedKeywords = [...KEYWORDS].sort((a, b) => {
    const sa = scans[a]?.heat_score ?? -1;
    const sb = scans[b]?.heat_score ?? -1;
    return sb - sa;
  });

  const hasData = Object.keys(scans).length > 0;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-gray-900 tracking-tight">
            Social Heatmap
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            X.com engagement tracking — {KEYWORDS.length} keywords
          </p>
          {lastScan && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Last scan: {new Date(lastScan).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
        </div>

        <button
          onClick={runScan}
          disabled={scanning}
          className={`
            px-4 py-2 rounded font-mono text-sm font-medium transition-all
            ${scanning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800 cursor-pointer'
            }
          `}
        >
          {scanning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Scanning...
            </span>
          ) : (
            '↻ Run Scan'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-gray-500">Heat:</span>
        {[
          { label: 'Cool', bg: 'bg-blue-100' },
          { label: '', bg: 'bg-cyan-200' },
          { label: '', bg: 'bg-lime-300' },
          { label: '', bg: 'bg-yellow-300' },
          { label: '', bg: 'bg-amber-400' },
          { label: '', bg: 'bg-orange-500' },
          { label: 'Hot', bg: 'bg-red-600' },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${l.bg}`} />
            {l.label && <span className="text-xs font-mono text-gray-500">{l.label}</span>}
          </div>
        ))}
        <span className="text-xs font-mono text-gray-400 ml-2">
          Score 0–100 (Claude web_search assessment)
        </span>
      </div>

      {/* Heatmap Grid */}
      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 font-mono text-sm">No scan data yet.</p>
          <p className="text-gray-400 font-mono text-xs mt-1">
            Click &ldquo;↻ Run Scan&rdquo; to begin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {sortedKeywords.map((keyword) => {
            const scan = scans[keyword];
            const score = scan?.heat_score ?? 0;
            const colors = heatColor(score);
            const hasScore = scan !== undefined;

            return (
              <div
                key={keyword}
                className={`
                  relative rounded-lg border p-3 transition-transform hover:scale-105
                  ${hasScore ? `${colors.bg} ${colors.border}` : 'bg-gray-50 border-gray-200'}
                `}
              >
                {/* Score badge */}
                {hasScore && (
                  <div className={`absolute top-2 right-2 text-xs font-mono font-bold ${colors.text} opacity-80`}>
                    {score.toFixed(0)}
                  </div>
                )}

                {/* Keyword */}
                <p className={`text-xs font-mono font-medium leading-tight pr-6 ${hasScore ? colors.text : 'text-gray-500'}`}>
                  {keyword}
                </p>

                {/* View count (present for legacy scans) */}
                {hasScore && scan?.view_count !== undefined && scan.view_count > 0 && (
                  <p className={`text-xs font-mono mt-1.5 opacity-75 ${colors.text}`}>
                    {formatViews(scan.view_count)} views
                  </p>
                )}

                {/* Avg comparison (present for legacy scans) */}
                {hasScore && scan?.avg_views !== undefined && scan.avg_views > 0 && (
                  <p className={`text-xs font-mono opacity-60 ${colors.text}`}>
                    avg {formatViews(Math.round(scan.avg_views))}
                  </p>
                )}

                {!hasScore && (
                  <p className="text-xs font-mono text-gray-400 mt-1">not scanned</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Top movers table */}
      {hasData && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-mono text-sm font-semibold text-gray-900">Top Movers</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left font-mono text-xs text-gray-500 px-5 py-2">Rank</th>
                <th className="text-left font-mono text-xs text-gray-500 px-5 py-2">Keyword</th>
                <th className="text-right font-mono text-xs text-gray-500 px-5 py-2">Heat</th>
              </tr>
            </thead>
            <tbody>
              {sortedKeywords
                .filter((k) => scans[k])
                .slice(0, 10)
                .map((keyword, idx) => {
                  const scan = scans[keyword];
                  const colors = heatColor(scan.heat_score);
                  return (
                    <tr key={keyword} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-400">#{idx + 1}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-800">{keyword}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${colors.bg} ${colors.text}`}>
                          {scan.heat_score.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
