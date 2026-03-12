'use client';

import { useState, useEffect, useCallback } from 'react';

// Mock data shown when FINANCIAL_DATASETS_API_KEY is not configured
const MOCK_DATA: Record<string, CompanyFacts> = {
  AAPL: {
    name: 'Apple Inc.',
    ticker: 'AAPL',
    cik: '320193',
    industry: 'Consumer Electronics',
    sector: 'Technology',
    market_capitalization: 3_200_000_000_000,
    number_of_employees: 164_000,
    ceo: 'Tim Cook',
    description: 'Apple Inc. designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories worldwide.',
    website_url: 'https://www.apple.com',
    exchange: 'NASDAQ',
    currency: 'USD',
  },
  NVDA: {
    name: 'NVIDIA Corporation',
    ticker: 'NVDA',
    cik: '1045810',
    industry: 'Semiconductors',
    sector: 'Technology',
    market_capitalization: 2_900_000_000_000,
    number_of_employees: 36_000,
    ceo: 'Jensen Huang',
    description: 'NVIDIA Corporation provides graphics, compute and networking solutions in the US, Taiwan, China, and internationally.',
    website_url: 'https://www.nvidia.com',
    exchange: 'NASDAQ',
    currency: 'USD',
  },
  MSFT: {
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    cik: '789019',
    industry: 'Software—Infrastructure',
    sector: 'Technology',
    market_capitalization: 3_100_000_000_000,
    number_of_employees: 228_000,
    ceo: 'Satya Nadella',
    description: 'Microsoft Corporation develops and supports software, services, devices and solutions worldwide.',
    website_url: 'https://www.microsoft.com',
    exchange: 'NASDAQ',
    currency: 'USD',
  },
};

interface CompanyFacts {
  name: string;
  ticker: string;
  cik?: string;
  industry?: string;
  sector?: string;
  market_capitalization?: number;
  number_of_employees?: number;
  ceo?: string;
  description?: string;
  website_url?: string;
  exchange?: string;
  currency?: string;
}

interface IncomeStatement {
  period_of_report: string;
  revenue?: number;
  gross_profit?: number;
  operating_income?: number;
  net_income?: number;
}

interface BalanceSheet {
  period_of_report: string;
  total_assets?: number;
  total_liabilities?: number;
  shareholders_equity?: number;
}

interface CashFlowStatement {
  period_of_report: string;
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
}

interface FinancialMetric {
  period_of_report: string;
  price_to_earnings_ratio?: number;
  price_to_book_ratio?: number;
  ev_to_ebitda?: number;
  price_to_sales_ratio?: number;
}

function fmt(n: number | undefined | null, decimals = 1): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(decimals)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '—';
  return n.toFixed(decimals) + 'x';
}

function fmtDate(s: string | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const CELL = {
  fontFamily: MONO,
  fontSize: '12px',
  padding: '6px 12px',
  color: '#2d2d2b',
  borderBottom: '1px solid #f0f0ee',
};

const HEADER_CELL = {
  ...CELL,
  color: '#9b9b97',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  background: '#fafaf8',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontFamily: MONO,
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#9b9b97',
      padding: '10px 16px 6px',
      borderBottom: '1px solid #e8e8e4',
      background: '#fafaf8',
    }}>
      {title}
    </div>
  );
}

export default function AnalyticsPage() {
  const [ticker, setTicker] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [facts, setFacts] = useState<CompanyFacts | null>(null);
  const [income, setIncome] = useState<IncomeStatement[]>([]);
  const [balance, setBalance] = useState<BalanceSheet[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowStatement[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError('');
    setFacts(null);
    setIncome([]);
    setBalance([]);
    setCashflow([]);
    setMetrics([]);

    try {
      // Company facts
      const factsRes = await fetch(`/api/analytics?endpoint=company/facts&ticker=${t}`);
      const factsData = await factsRes.json();

      if (factsData.mock) {
        // No API key — show mock data
        setIsMock(true);
        const mockTicker = MOCK_DATA[t.toUpperCase()] ? t.toUpperCase() : 'AAPL';
        setFacts(MOCK_DATA[mockTicker]);
        return;
      }

      setIsMock(false);
      const cf = factsData?.company_facts ?? factsData;
      // Normalize company facts field names
      setFacts({
        ...cf,
        market_capitalization: cf.market_capitalization ?? cf.market_cap ?? undefined,
        number_of_employees: cf.number_of_employees ?? cf.employees ?? undefined,
        ceo: cf.ceo ?? undefined,
        description: cf.description ?? cf.long_description ?? undefined,
        website_url: cf.website_url ?? undefined,
      });

      // Financials in parallel
      const [incRes, balRes, cashRes, metRes] = await Promise.all([
        fetch(`/api/analytics?endpoint=financials/income-statements&ticker=${t}&period=annual&limit=4`),
        fetch(`/api/analytics?endpoint=financials/balance-sheets&ticker=${t}&period=annual&limit=4`),
        fetch(`/api/analytics?endpoint=financials/cash-flow-statements&ticker=${t}&period=annual&limit=4`),
        fetch(`/api/analytics?endpoint=financial-metrics&ticker=${t}&period=annual&limit=4`),
      ]);

      const [incData, balData, cashData, metData] = await Promise.all([
        incRes.json(), balRes.json(), cashRes.json(), metRes.json(),
      ]);

      // Normalize field names from financialdatasets.ai API
      // API uses report_period; page uses period_of_report
      // Cash flow API uses net_cash_flow_from_operations etc
      const normalizeDate = (r: Record<string, unknown>) => ({
        ...r,
        period_of_report: r.period_of_report ?? r.report_period,
      });
      const normalizeCF = (r: Record<string, unknown>) => ({
        ...normalizeDate(r),
        operating_cash_flow: r.operating_cash_flow ?? r.net_cash_flow_from_operations,
        investing_cash_flow: r.investing_cash_flow ?? r.net_cash_flow_from_investing,
        financing_cash_flow: r.financing_cash_flow ?? r.net_cash_flow_from_financing,
      });
      const normalizeMetric = (r: Record<string, unknown>) => ({
        ...normalizeDate(r),
        ev_to_ebitda: r.ev_to_ebitda ?? r.enterprise_value_to_ebitda_ratio,
      });

      setIncome((incData?.income_statements ?? incData?.financials ?? []).map(normalizeDate));
      setBalance((balData?.balance_sheets ?? balData?.financials ?? []).map(normalizeDate));
      setCashflow((cashData?.cash_flow_statements ?? cashData?.financials ?? []).map(normalizeCF));
      setMetrics((metData?.financial_metrics ?? metData?.metrics ?? []).map(normalizeMetric));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(ticker);
  }, [ticker, load]);

  const handleSearch = () => {
    const t = inputValue.trim().toUpperCase();
    if (t) setTicker(t);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: SANS, fontSize: '1.375rem', fontWeight: 700, color: '#0f0f0e', margin: 0, lineHeight: 1.2 }}>
            Analytics
          </h1>
          <p style={{ fontFamily: MONO, fontSize: '11px', color: '#9b9b97', margin: '4px 0 0' }}>
            Bloomberg-Lite Terminal — financialdatasets.ai
          </p>
        </div>

        {/* Ticker search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="AAPL"
            style={{
              fontFamily: MONO,
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px 12px',
              border: '1.5px solid #e0e0da',
              borderRadius: '5px',
              outline: 'none',
              width: '100px',
              background: '#fff',
              color: '#0f0f0e',
              textTransform: 'uppercase',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              fontFamily: MONO,
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 16px',
              background: '#0f0f0e',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Load
          </button>
        </div>
      </div>

      {isMock && (
        <div style={{
          fontFamily: MONO,
          fontSize: '11px',
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '5px',
          padding: '8px 14px',
          color: '#92400e',
          marginBottom: '1.25rem',
        }}>
          MOCK DATA — Add <code>FINANCIAL_DATASETS_API_KEY</code> to Vercel env vars for live data on all US tickers.
        </div>
      )}

      {error && (
        <div style={{
          fontFamily: MONO, fontSize: '11px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: '5px',
          padding: '8px 14px', color: '#dc2626', marginBottom: '1.25rem',
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ fontFamily: MONO, fontSize: '12px', color: '#9b9b97', padding: '3rem 0', textAlign: 'center' }}>
          Loading {ticker}…
        </div>
      )}

      {!loading && facts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Company Facts */}
          <div className="content-box" style={{ overflow: 'hidden' }}>
            <SectionHeader title="Company Facts" />
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 24px' }}>
              {[
                { label: 'Name', value: facts.name },
                { label: 'Ticker', value: facts.ticker },
                { label: 'Exchange', value: facts.exchange },
                { label: 'Sector', value: facts.sector },
                { label: 'Industry', value: facts.industry },
                { label: 'Market Cap', value: fmt(facts.market_capitalization, 1) },
                { label: 'Employees', value: facts.number_of_employees?.toLocaleString() ?? '—' },
                { label: 'CEO', value: facts.ceo },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: '9px', color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: '12px', color: '#0f0f0e', fontWeight: 600 }}>{value || '—'}</div>
                </div>
              ))}
              {facts.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: MONO, fontSize: '9px', color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontFamily: SANS, fontSize: '12px', color: '#4b4b47', lineHeight: 1.6 }}>{facts.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* Valuation Metrics */}
          {metrics.length > 0 && (
            <div className="content-box" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Valuation Metrics (Annual)" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...HEADER_CELL, textAlign: 'left' }}>Period</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>P/E</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>P/B</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>EV/EBITDA</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>P/S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m, i) => (
                      <tr key={i}>
                        <td style={{ ...CELL, textAlign: 'left' }}>{fmtDate(m.period_of_report)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmtNum(m.price_to_earnings_ratio)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmtNum(m.price_to_book_ratio)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmtNum(m.ev_to_ebitda)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmtNum(m.price_to_sales_ratio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* P&L */}
          {income.length > 0 && (
            <div className="content-box" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Income Statement (Annual)" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...HEADER_CELL, textAlign: 'left' }}>Period</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Revenue</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Gross Profit</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Op. Income</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...CELL, textAlign: 'left' }}>{fmtDate(r.period_of_report)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.revenue)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.gross_profit)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.operating_income)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.net_income)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Balance Sheet */}
          {balance.length > 0 && (
            <div className="content-box" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Balance Sheet (Annual)" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...HEADER_CELL, textAlign: 'left' }}>Period</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Total Assets</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Total Liabilities</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...CELL, textAlign: 'left' }}>{fmtDate(r.period_of_report)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.total_assets)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.total_liabilities)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.shareholders_equity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash Flow */}
          {cashflow.length > 0 && (
            <div className="content-box" style={{ overflow: 'hidden' }}>
              <SectionHeader title="Cash Flow (Annual)" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...HEADER_CELL, textAlign: 'left' }}>Period</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Operating</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Investing</th>
                      <th style={{ ...HEADER_CELL, textAlign: 'right' }}>Financing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...CELL, textAlign: 'left' }}>{fmtDate(r.period_of_report)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.operating_cash_flow)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.investing_cash_flow)}</td>
                        <td style={{ ...CELL, textAlign: 'right' }}>{fmt(r.financing_cash_flow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No paid data available message */}
          {!isMock && income.length === 0 && balance.length === 0 && cashflow.length === 0 && metrics.length === 0 && (
            <div className="content-box" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: '12px', color: '#9b9b97', margin: 0 }}>
                Financials, metrics, and estimates require a financialdatasets.ai API key.
              </p>
              <p style={{ fontFamily: MONO, fontSize: '11px', color: '#b0b0aa', margin: '6px 0 0' }}>
                Add FINANCIAL_DATASETS_API_KEY to Vercel env vars to enable paid endpoints.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
