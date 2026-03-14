'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── palette ────────────────────────────────────────────────────────────────
const G = {
  bg: '#000000', surf: '#080d08', surfAlt: '#0d150d',
  b: '#1a2e1a', bBright: '#2a4a2a',
  green: '#00ff41', greenDim: '#00cc33', greenMuted: '#005515', greenFaint: '#001a08',
  text: '#ccffcc', muted: '#4a7a4a', dim: '#2a4a2a',
  amber: '#ffcc00', red: '#ff4444', blue: '#4a9eff',
  mono: "'IBM Plex Mono','Courier New',monospace",
} as const;

// ─── quick-ticker chips ──────────────────────────────────────────────────────
const QUICK = ['NVDA', 'ASML', 'TSM', 'AMAT', 'LRCX', 'KLAC', 'WTC', 'AAPL', 'MSFT'];

// ─── types ───────────────────────────────────────────────────────────────────
interface BloombergData {
  ticker: string; bbg_ticker: string; px_last: number | null;
  fwd_pe: number | null; ev_ebitda: number | null;
  consensus_eps_fy1: number | null; consensus_eps_fy2: number | null;
  consensus_rev_fy1: number | null;
  target_price_mean: number | null; target_price_high: number | null; target_price_low: number | null;
  buy_count: number | null; hold_count: number | null; sell_count: number | null;
  short_interest_ratio: number | null; next_earnings_date: string | null;
  high_52w: number | null; low_52w: number | null;
  ytd_return: number | null; dividend_yield: number | null;
  market_cap: number | null; updated_at: string | null;
}
interface CompanyInfo { ticker: string; name: string; sector: string; agent_key: string; agent_name: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, decimals = 1, suffix = '') =>
  v == null ? '—' : `${v.toFixed(decimals)}${suffix}`;

const fmtMktCap = (v: number | null) => {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
};

// ─── sub-components ──────────────────────────────────────────────────────────

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: G.surf, border: `1px solid ${G.b}`, borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: G.surfAlt }}>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.green, letterSpacing: 2 }}>{title}</span>
        {badge && <span style={{ fontFamily: G.mono, fontSize: 9, color: G.muted, background: G.bg, border: `1px solid ${G.b}`, borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>{badge}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function HeadlineBox({ bbg, company, ticker, livePrice }: { bbg: BloombergData | null; company: CompanyInfo | null; ticker: string; livePrice: number | null }) {
  const price = livePrice ?? bbg?.px_last ?? null;
  const ytd = bbg?.ytd_return ?? null;
  const up = ytd != null ? ytd >= 0 : true;
  const col = up ? G.green : G.red;
  const sign = up ? '+' : '';

  return (
    <div style={{ background: G.surf, border: `1px solid ${G.bBright}`, borderRadius: 4, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: G.mono, fontSize: 28, color: G.green, fontWeight: 700, letterSpacing: 2 }}>{ticker}</span>
        <span style={{ fontFamily: G.mono, color: G.muted, fontSize: 14 }}>{company?.name ?? '—'}</span>
        <span style={{ fontFamily: G.mono, color: G.muted, fontSize: 13, marginLeft: 'auto' }}>{company?.sector ?? '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {price != null ? (
          <span style={{ fontFamily: G.mono, fontSize: 36, color: G.text, fontWeight: 700 }}>{price.toFixed(2)}</span>
        ) : (
          <span style={{ fontFamily: G.mono, fontSize: 24, color: G.dim }}>—</span>
        )}
        {livePrice && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>LIVE</span>}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
        {[
          ['Mkt Cap',    fmtMktCap(bbg?.market_cap ?? null)],
          ['Fwd P/E',    fmt(bbg?.fwd_pe, 1, 'x')],
          ['EV/EBITDA',  fmt(bbg?.ev_ebitda, 1, 'x')],
          ['52W High',   fmt(bbg?.high_52w, 2)],
          ['52W Low',    fmt(bbg?.low_52w, 2)],
          ['YTD',        ytd != null ? `${sign}${ytd.toFixed(1)}%` : '—'],
          ['Div Yield',  fmt(bbg?.dividend_yield, 2, '%')],
          ['Short Int',  fmt(bbg?.short_interest_ratio, 1, 'x')],
          ['Next Earn',  bbg?.next_earnings_date ?? '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{k}</span>
            <span style={{ fontFamily: G.mono, fontSize: 13, color: k === 'YTD' ? col : G.text }}>{v}</span>
          </div>
        ))}
      </div>
      {bbg?.updated_at && (
        <div style={{ marginTop: 10, fontFamily: G.mono, fontSize: 10, color: G.dim }}>
          Bloomberg sync: {new Date(bbg.updated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function AgentChat({ agentKey, agentName, ticker }: { agentKey: string; agentName: string; ticker: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]); setThreadId(null);
    fetch(`/api/agents/${agentKey}`, { headers: { authorization: 'Bearer fingerthumb' } })
      .then(r => r.json())
      .then(d => {
        const msgs: ChatMessage[] = (d.messages ?? []).slice(-6).map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        setMessages(msgs);
        setThreadId(d.thread_id ?? null);
      }).catch(() => {});
  }, [agentKey]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer fingerthumb' },
        body: JSON.stringify({ agent_key: agentKey, message: q, ticker, thread_id: threadId }),
      });
      const d = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: d.response ?? d.error ?? '...' }]);
      if (d.thread_id) setThreadId(d.thread_id);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error — check connection.' }]);
    } finally { setLoading(false); }
  }, [input, loading, agentKey, ticker, threadId]);

  return (
    <div style={{ background: G.surf, border: `1px solid ${G.b}`, borderRadius: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.green, letterSpacing: 2 }}>AGENT · {agentKey}</span>
        <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>{agentName}</span>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${G.b}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[`Bull case for ${ticker}?`, `Key risks for ${ticker}?`, `Latest earnings summary?`, `Valuation vs peers?`].map(p => (
          <button key={p} onClick={() => setInput(p)} style={{ fontFamily: G.mono, fontSize: 10, color: G.greenDim, background: G.greenFaint, border: `1px solid ${G.greenMuted}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>{p}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {messages.length === 0 && <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, textAlign: 'center', marginTop: 40 }}>Ask {agentKey} about {ticker}</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.role === 'user' ? 'YOU' : agentKey}</div>
            <div style={{ background: m.role === 'user' ? G.greenFaint : G.surfAlt, border: `1px solid ${m.role === 'user' ? G.greenMuted : G.b}`, borderRadius: 4, padding: '8px 12px', fontFamily: G.mono, fontSize: 12, color: G.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 3 }}>{agentKey}</div>
            <div style={{ background: G.surfAlt, border: `1px solid ${G.b}`, borderRadius: 4, padding: '8px 12px', fontFamily: G.mono, fontSize: 12, color: G.greenDim }}>▋</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${G.b}`, display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder={`Ask about ${ticker}…`}
          style={{ flex: 1, fontFamily: G.mono, fontSize: 12, color: G.text, background: G.bg, border: `1px solid ${G.b}`, borderRadius: 3, padding: '8px 10px', outline: 'none' }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ fontFamily: G.mono, fontSize: 11, color: G.bg, background: loading ? G.greenMuted : G.green, border: 'none', borderRadius: 3, padding: '0 14px', cursor: loading ? 'default' : 'pointer', letterSpacing: 1 }}>
          SEND
        </button>
      </div>
    </div>
  );
}

function EstimatesPanel({ bbg }: { bbg: BloombergData }) {
  const items = [
    { label: 'EPS FY1E',    value: bbg.consensus_eps_fy1,  prefix: '' },
    { label: 'EPS FY2E',    value: bbg.consensus_eps_fy2,  prefix: '' },
    { label: 'Rev FY1E',    value: bbg.consensus_rev_fy1,  prefix: '$', suffix: 'B', divisor: 1e9 },
  ];
  return (
    <Panel title="CONSENSUS ESTIMATES" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {items.map(item => (
          <div key={item.label} style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 6, letterSpacing: 1 }}>{item.label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 22, color: G.green, fontWeight: 700 }}>
              {item.value == null ? '—' : item.divisor
                ? `${item.prefix}${(item.value / item.divisor).toFixed(1)}${item.suffix}`
                : `${item.prefix}${item.value.toFixed(2)}`}
            </div>
          </div>
        ))}
        {bbg.target_price_mean != null && (
          <div style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 6, letterSpacing: 1 }}>PT RANGE</div>
            <div style={{ fontFamily: G.mono, fontSize: 22, color: G.amber, fontWeight: 700 }}>{fmt(bbg.target_price_mean, 2)}</div>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginTop: 3 }}>
              {fmt(bbg.target_price_low, 2)} – {fmt(bbg.target_price_high, 2)}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function AnalystRatings({ bbg }: { bbg: BloombergData }) {
  const buy  = bbg.buy_count  ?? 0;
  const hold = bbg.hold_count ?? 0;
  const sell = bbg.sell_count ?? 0;
  const total = buy + hold + sell;
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round(n / total * 100)}%`;
  const barW = (n: number) => `${Math.round(n / total * 100)}%`;
  return (
    <Panel title="ANALYST RATINGS" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {[['BUY', G.green, buy], ['HOLD', G.amber, hold], ['SELL', G.red, sell]].map(([label, col, n]) => (
          <div key={label as string} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: G.mono, fontSize: 32, color: col as string, fontWeight: 700 }}>{n as number}</div>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
        {bbg.target_price_mean != null && (
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, marginBottom: 2 }}>CONSENSUS TARGET</div>
            <div style={{ fontFamily: G.mono, fontSize: 24, color: G.text }}>{fmt(bbg.target_price_mean, 2)}</div>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>
              Lo {fmt(bbg.target_price_low, 2)} · Hi {fmt(bbg.target_price_high, 2)}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        <div style={{ width: barW(buy),  background: G.green, transition: 'width 0.5s' }} />
        <div style={{ width: barW(hold), background: G.amber, transition: 'width 0.5s' }} />
        <div style={{ width: barW(sell), background: G.red,   transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {[['BUY', G.green, buy], ['HOLD', G.amber, hold], ['SELL', G.red, sell]].map(([label, col, n]) => (
          <span key={label as string} style={{ fontFamily: G.mono, fontSize: 10, color: col as string }}>{pct(n as number)} {label}</span>
        ))}
      </div>
    </Panel>
  );
}

function ValuationPanel({ bbg }: { bbg: BloombergData }) {
  const rows = [
    { label: 'Fwd P/E',   value: bbg.fwd_pe,    color: G.green },
    { label: 'EV/EBITDA', value: bbg.ev_ebitda,  color: G.blue },
  ].filter(r => r.value != null);
  if (rows.length === 0) return null;
  const maxVal = Math.max(...rows.map(r => r.value!)) * 1.2;
  return (
    <Panel title="VALUATION MULTIPLES" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {rows.map(r => (
          <div key={r.label} style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>{r.label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 26, color: r.color, fontWeight: 700 }}>{r.value!.toFixed(1)}x</div>
          </div>
        ))}
        {bbg.short_interest_ratio != null && (
          <div style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>SHORT INT RATIO</div>
            <div style={{ fontFamily: G.mono, fontSize: 26, color: G.amber, fontWeight: 700 }}>{bbg.short_interest_ratio.toFixed(1)}x</div>
          </div>
        )}
      </div>
      <div style={{ height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.map(r => ({ name: r.label, value: r.value }))} layout="vertical">
            <CartesianGrid strokeDasharray="2 4" stroke={G.b} horizontal={false} />
            <XAxis type="number" domain={[0, maxVal]} tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} width={72} />
            <Tooltip contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }} labelStyle={{ color: G.green }} itemStyle={{ color: G.text }} formatter={(v: unknown) => [`${(v as number).toFixed(1)}x`, '']} />
            <Bar dataKey="value" fill={G.green} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function RangeBar({ label, low, high, current }: { label: string; low: number; high: number; current: number | null }) {
  const range = high - low;
  const posPct = current != null && range > 0 ? ((current - low) / range * 100).toFixed(1) : null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>{label}</span>
        {posPct != null && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.green }}>{posPct}% of range</span>}
      </div>
      <div style={{ position: 'relative', height: 8, background: G.b, borderRadius: 4 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: G.greenFaint, borderRadius: 4 }} />
        {posPct != null && (
          <div style={{ position: 'absolute', left: `${posPct}%`, top: -3, width: 3, height: 14, background: G.green, borderRadius: 2, transform: 'translateX(-50%)' }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>{low.toFixed(2)}</span>
        {current != null && <span style={{ fontFamily: G.mono, fontSize: 10, color: G.text }}>{current.toFixed(2)}</span>}
        <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>{high.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PriceRangePanel({ bbg, livePrice }: { bbg: BloombergData; livePrice: number | null }) {
  const price = livePrice ?? bbg.px_last;
  if (!bbg.high_52w || !bbg.low_52w) return null;
  return (
    <Panel title="52-WEEK RANGE" badge="Bloomberg">
      <RangeBar label="52W Price Range" low={bbg.low_52w} high={bbg.high_52w} current={price} />
    </Panel>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [ticker, setTicker]         = useState('NVDA');
  const [inputVal, setInputVal]     = useState('NVDA');
  const [bbg, setBbg]               = useState<BloombergData | null>(null);
  const [company, setCompany]       = useState<CompanyInfo | null>(null);
  const [livePrice, setLivePrice]   = useState<number | null>(null);
  const [loading, setLoading]       = useState(false);
  const [notFound, setNotFound]     = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true); setBbg(null); setCompany(null); setLivePrice(null); setNotFound(false);

    // Fetch Bloomberg data + company info in parallel
    Promise.all([
      fetch(`/api/bloomberg?ticker=${ticker}`).then(r => r.json()),
      fetch(`/api/companies`, { headers: { authorization: 'Bearer fingerthumb' } }).then(r => r.json()),
      fetch(`/api/price?tickers=${ticker}`).then(r => r.json()).catch(() => ({})),
    ]).then(([bbgData, companies, priceData]) => {
      setBbg(bbgData ?? null);
      setNotFound(!bbgData);
      const co = (companies as CompanyInfo[]).find((c: CompanyInfo) => c.ticker === ticker);
      setCompany(co ?? null);
      const q = priceData?.[ticker];
      if (q?.regularMarketPrice) setLivePrice(q.regularMarketPrice);
    }).finally(() => setLoading(false));
  }, [ticker]);

  const lookup = () => {
    const t = inputVal.trim().toUpperCase();
    if (t) setTicker(t);
  };

  const agentKey  = company?.agent_key ?? 'APEX';
  const agentName = company?.agent_name ?? 'Asia Pacific';

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: G.mono }}>
      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: G.bg, borderBottom: `1px solid ${G.b}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: G.green, letterSpacing: 3, fontWeight: 700 }}>ANALYTICS</span>
        <div style={{ display: 'flex' }}>
          <input value={inputVal} onChange={e => setInputVal(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && lookup()} placeholder="TICKER"
            style={{ fontFamily: G.mono, fontSize: 13, color: G.green, background: G.surf, border: `1px solid ${G.bBright}`, borderRight: 'none', borderRadius: '3px 0 0 3px', padding: '6px 10px', width: 120, outline: 'none', letterSpacing: 2 }} />
          <button onClick={lookup} style={{ fontFamily: G.mono, fontSize: 11, color: G.bg, background: G.green, border: 'none', borderRadius: '0 3px 3px 0', padding: '0 14px', cursor: 'pointer', letterSpacing: 1 }}>LOAD</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK.map(t => (
            <button key={t} onClick={() => { setTicker(t); setInputVal(t); }}
              style={{ fontFamily: G.mono, fontSize: 11, letterSpacing: 1, color: t === ticker ? G.bg : G.greenDim, background: t === ticker ? G.green : G.greenFaint, border: `1px solid ${t === ticker ? G.green : G.greenMuted}`, borderRadius: 3, padding: '3px 10px', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
        {loading && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>Loading…</span>}
      </div>

      {/* body */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {notFound && !loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ fontFamily: G.mono, fontSize: 14, color: G.muted }}>
              No Bloomberg data for <span style={{ color: G.green }}>{ticker}</span>
            </p>
            <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, marginTop: 8 }}>
              Run bloomberg-sync.py to populate data for this ticker, or check the bbg_ticker in seed.json.
            </p>
          </div>
        ) : bbg ? (
          <>
            <HeadlineBox bbg={bbg} company={company} ticker={ticker} livePrice={livePrice} />

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* left: sticky agent chat */}
              <div style={{ width: 360, flexShrink: 0, position: 'sticky', top: 60, height: 'calc(100vh - 80px)' }}>
                <AgentChat agentKey={agentKey} agentName={agentName} ticker={ticker} />
              </div>

              {/* right: analysis stack */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <EstimatesPanel bbg={bbg} />
                <AnalystRatings bbg={bbg} />
                <ValuationPanel bbg={bbg} />
                <PriceRangePanel bbg={bbg} livePrice={livePrice} />
              </div>
            </div>
          </>
        ) : !loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ fontFamily: G.mono, fontSize: 14, color: G.muted }}>Enter a ticker to load Bloomberg data</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
