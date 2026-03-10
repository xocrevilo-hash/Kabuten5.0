'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface Company {
  id: number;
  name: string;
  ticker: string;
  exchange: string;
  country: string;
  sector: string;
  agent_key: string | null;
  agent_name: string | null;
  market_cap_usd: number | null;
  bloomberg_market_cap: number | null;
  classification: string;
  rating: string | null;
  last_sweep: string | null;
}

type SortKey = 'name' | 'ticker' | 'exchange' | 'country' | 'sector' | 'agent_key' | 'market_cap' | 'rating' | 'last_sweep';
type SortDir = 'asc' | 'desc';

const AGENT_COLOURS: Record<string, string> = {
  apex: 'bg-green-100 text-green-800',
  crypto: 'bg-violet-100 text-violet-800',
  dragon: 'bg-sky-100 text-sky-800',
  ferro: 'bg-red-100 text-red-800',
  forge: 'bg-teal-100 text-teal-800',
  forge_jp: 'bg-teal-100 text-teal-800',
  helix: 'bg-amber-100 text-amber-800',
  indra: 'bg-purple-100 text-purple-800',
  keynes: 'bg-slate-100 text-slate-800',
  layer: 'bg-yellow-100 text-yellow-800',
  mario: 'bg-pink-100 text-pink-800',
  masa: 'bg-cyan-100 text-cyan-800',
  miner: 'bg-stone-100 text-stone-700',
  nova: 'bg-amber-100 text-amber-800',
  optim: 'bg-orange-100 text-orange-800',
  orient: 'bg-blue-100 text-blue-800',
  orient_mid: 'bg-blue-100 text-blue-800',
  photon: 'bg-red-100 text-red-800',
  pilbara: 'bg-stone-100 text-stone-700',
  pixel: 'bg-blue-100 text-blue-800',
  rack: 'bg-teal-100 text-teal-800',
  rocket: 'bg-slate-100 text-slate-800',
  shrink: 'bg-slate-100 text-slate-800',
  surge: 'bg-pink-100 text-pink-800',
  synth: 'bg-lime-100 text-lime-800',
  terra: 'bg-green-100 text-green-800',
  tide: 'bg-purple-100 text-purple-800',
  volt: 'bg-yellow-100 text-yellow-800',
};

const RATING_COLOURS: Record<string, string> = {
  BUY: 'bg-emerald-50 text-emerald-700',
  NEUTRAL: 'bg-gray-100 text-gray-600',
  SELL: 'bg-red-50 text-red-700',
};

function formatMarketCap(usd: number | null): string {
  if (!usd) return '—';
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(1)}T`;
  if (usd >= 1e9)  return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6)  return `$${(usd / 1e6).toFixed(1)}M`;
  return `$${usd.toLocaleString()}`;
}

function formatLastSweep(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

export default function CoveragePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return companies.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      (c.sector || '').toLowerCase().includes(q) ||
      (c.agent_key || '').toLowerCase().includes(q) ||
      (c.agent_name || '').toLowerCase().includes(q)
    );
  }, [companies, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;

      switch (sortKey) {
        case 'name':       av = a.name;       bv = b.name;       break;
        case 'ticker':     av = a.ticker;     bv = b.ticker;     break;
        case 'exchange':   av = a.exchange;   bv = b.exchange;   break;
        case 'country':    av = a.country;    bv = b.country;    break;
        case 'sector':     av = a.sector;     bv = b.sector;     break;
        case 'agent_key':  av = a.agent_key;  bv = b.agent_key;  break;
        case 'market_cap': av = a.bloomberg_market_cap ?? a.market_cap_usd; bv = b.bloomberg_market_cap ?? b.market_cap_usd; break;
        case 'rating':     av = a.rating;     bv = b.rating;     break;
        case 'last_sweep': av = a.last_sweep; bv = b.last_sweep; break;
      }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const thClass = 'px-4 py-2 text-left font-mono text-xs text-gray-500 cursor-pointer select-none hover:text-gray-800 whitespace-nowrap';

  return (
    <div className="min-h-screen bg-[#f4f4ef] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-gray-900 tracking-tight">Coverage Universe</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            {loading ? '—' : `${sorted.length} of ${companies.length} companies`}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by company, ticker, sector or analyst..."
          className="w-full max-w-xl px-4 py-2 rounded-lg border border-gray-200 bg-white font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className={thClass} onClick={() => handleSort('name')}>
                  Company <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort('ticker')}>
                  Ticker <SortIcon col="ticker" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort('exchange')}>
                  Exchange <SortIcon col="exchange" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort('country')}>
                  Country <SortIcon col="country" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort('sector')}>
                  Sector <SortIcon col="sector" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort('agent_key')}>
                  Analyst <SortIcon col="agent_key" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort('market_cap')}>
                  Market Cap <SortIcon col="market_cap" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('rating')}>
                  Rating <SortIcon col="rating" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort('last_sweep')}>
                  Last Sweep <SortIcon col="last_sweep" sortKey={sortKey} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-mono text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-mono text-sm text-gray-400">
                    No companies match your filter.
                  </td>
                </tr>
              ) : sorted.map(c => {
                const agentColour = c.agent_key ? (AGENT_COLOURS[c.agent_key] || 'bg-gray-100 text-gray-600') : '';
                const ratingColour = c.rating ? (RATING_COLOURS[c.rating.toUpperCase()] || 'bg-gray-100 text-gray-600') : '';
                const marketCap = c.bloomberg_market_cap ?? c.market_cap_usd;

                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2 text-gray-900 font-medium whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-gray-700 whitespace-nowrap">{c.ticker}</td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{c.exchange}</td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{c.country}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">{c.sector || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {c.agent_key ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${agentColour}`}>
                          {c.agent_key.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-600 whitespace-nowrap">
                      {formatMarketCap(marketCap)}
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      {c.rating ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${ratingColour}`}>
                          {c.rating.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatLastSweep(c.last_sweep)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
