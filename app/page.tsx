'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import KabutenLogo from '@/components/KabutenLogo';

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
  classification: string;
  ratings: Record<string, string> | null;
  last_sweep: string | null;
}

type SortKey = keyof Company | 'rating';
type SortDir = 'asc' | 'desc';

function formatMarketCap(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatLastSweep(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getRating(company: Company): string {
  if (!company.ratings) return '—';
  const ticker = company.ticker;
  const rating = company.ratings[ticker];
  if (rating) return rating.toUpperCase();
  const values = Object.values(company.ratings);
  if (values.length > 0) return values[0].toUpperCase();
  return '—';
}

function RatingPill({ rating }: { rating: string }) {
  if (rating === 'BUY') return <span className="pill-buy">BUY</span>;
  if (rating === 'SELL') return <span className="pill-sell">SELL</span>;
  if (rating === 'NEUTRAL') return <span className="pill-neutral">NEUTRAL</span>;
  return <span style={{ color: '#9b9b97', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>—</span>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <span style={{ color: '#d1d1cd', marginLeft: '4px' }}>↕</span>;
  }
  return (
    <span style={{ color: '#0f0f0e', marginLeft: '4px' }}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export default function CoveragePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then(data => {
        setCompanies(data);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const filtered = companies.filter(c => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      (c.sector ?? '').toLowerCase().includes(q) ||
      (c.agent_name ?? '').toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      (c.exchange ?? '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    if (sortKey === 'rating') {
      aVal = getRating(a);
      bVal = getRating(b);
    } else if (sortKey === 'last_sweep') {
      aVal = a.last_sweep ? new Date(a.last_sweep).getTime() : 0;
      bVal = b.last_sweep ? new Date(b.last_sweep).getTime() : 0;
    } else if (sortKey === 'market_cap_usd') {
      aVal = a.market_cap_usd ?? -1;
      bVal = b.market_cap_usd ?? -1;
    } else {
      aVal = (a[sortKey as keyof Company] as string | null) ?? '';
      bVal = (b[sortKey as keyof Company] as string | null) ?? '';
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal ?? '');
    const bStr = String(bVal ?? '');
    const cmp = aStr.localeCompare(bStr);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thStyle: React.CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <KabutenLogo />
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            color: '#9b9b97',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '0.5rem',
            marginBottom: '0.25rem',
          }}
        >
          Coverage Universe
        </p>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: '#c4c4c0',
            letterSpacing: '0.08em',
          }}
        >
          219 companies tracked across 17 sectors
        </p>
      </div>

      {/* Filter input */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '480px' }}>
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9b9b97',
              fontSize: '0.875rem',
              pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name, ticker, sector, country, exchange..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 30px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              border: '1.5px solid #e2e2e0',
              borderRadius: '8px',
              outline: 'none',
              color: '#0f0f0e',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#0f0f0e'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e2e2e0'; }}
          />
        </div>
        {filter && (
          <button
            onClick={() => setFilter('')}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#9b9b97',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="content-box" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: '#9b9b97',
            }}
          >
            Loading coverage universe...
          </div>
        ) : error ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: '#dc2626',
            }}
          >
            {error}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('name')}>
                    Company <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('ticker')}>
                    Ticker <SortIcon active={sortKey === 'ticker'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('exchange')}>
                    Exchange <SortIcon active={sortKey === 'exchange'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('country')}>
                    Country <SortIcon active={sortKey === 'country'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('sector')}>
                    Sector <SortIcon active={sortKey === 'sector'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('agent_name')}>
                    Analyst <SortIcon active={sortKey === 'agent_name'} dir={sortDir} />
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('market_cap_usd')}>
                    Mkt Cap <SortIcon active={sortKey === 'market_cap_usd'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('rating')}>
                    Rating <SortIcon active={sortKey === 'rating'} dir={sortDir} />
                  </th>
                  <th style={thStyle} onClick={() => handleSort('last_sweep')}>
                    Last Sweep <SortIcon active={sortKey === 'last_sweep'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(company => (
                  <tr key={company.id}>
                    <td>
                      <Link
                        href={`/company/${encodeURIComponent(company.ticker)}`}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500,
                          color: '#0f0f0e',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={e => {
                          (e.target as HTMLElement).style.textDecoration = 'underline';
                        }}
                        onMouseLeave={e => {
                          (e.target as HTMLElement).style.textDecoration = 'none';
                        }}
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#6b6b67',
                        }}
                      >
                        {company.ticker}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: '#9b9b97',
                        }}
                      >
                        {company.exchange}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: '#9b9b97',
                        }}
                      >
                        {company.country}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.8125rem',
                          color: '#6b6b67',
                        }}
                      >
                        {company.sector ?? '—'}
                      </span>
                    </td>
                    <td>
                      {company.agent_name ? (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#0f0f0e',
                          }}
                        >
                          {company.agent_name}
                        </span>
                      ) : (
                        <span style={{ color: '#9b9b97', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: company.market_cap_usd ? '#6b6b67' : '#9b9b97',
                        }}
                      >
                        {formatMarketCap(company.market_cap_usd)}
                      </span>
                    </td>
                    <td>
                      <RatingPill rating={getRating(company)} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: company.last_sweep ? '#6b6b67' : '#9b9b97',
                        }}
                      >
                        {formatLastSweep(company.last_sweep)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sorted.length === 0 && !loading && (
              <div
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8125rem',
                  color: '#9b9b97',
                }}
              >
                No companies match &ldquo;{filter}&rdquo;.
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '1rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: '#9b9b97',
          textAlign: 'right',
        }}
      >
        {filter
          ? `${sorted.length} of ${companies.length} companies shown`
          : `${companies.length} companies`}
      </div>
    </div>
  );
}
