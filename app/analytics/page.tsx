'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// ─── palette ────────────────────────────────────────────────────────────────
const G = {
  bg: '#000000', surf: '#080d08', surfAlt: '#0d150d',
  b: '#1a2e1a', bBright: '#2a4a2a',
  green: '#00ff41', greenDim: '#00cc33', greenMuted: '#005515', greenFaint: '#001a08',
  text: '#ccffcc', muted: '#4a7a4a', dim: '#2a4a2a',
  amber: '#ffcc00', red: '#ff4444', blue: '#4a9eff',
  mono: "'IBM Plex Mono','Courier New',monospace",
} as const;

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
  avg_volume: number | null;
  ceo_name: string | null;
  // Expanded fields
  actual_eps_last: number | null; actual_rev_last: number | null;
  eps_surprise_pct: number | null; rev_surprise_pct: number | null;
  last_report_date: string | null;
  guidance_eps_hi: number | null; guidance_eps_lo: number | null;
  eps_rev_1m: number | null; eps_rev_3m: number | null;
  rev_rev_1m: number | null; rev_rev_3m: number | null;
  est_up_1m: number | null; est_down_1m: number | null;
  best_eps_ntm: number | null;
  px_to_book: number | null; median_eps_fy1: number | null;
  num_estimates: number | null; eps_std_dev: number | null;
}
interface CompanyInfo { ticker: string; name: string; sector: string; agent_key: string; agent_name: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ─── helpers ─────────────────────────────────────────────────────────────────
const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
};

const fmt = (v: unknown, decimals = 1, suffix = '') => {
  const n = toNum(v);
  return n == null ? '—' : `${n.toFixed(decimals)}${suffix}`;
};

// Bloomberg CUR_MKT_CAP is in millions — display in bn
const fmtMktCapBn = (v: unknown) => {
  const n = toNum(v);
  if (n == null) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}tn`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}bn`;
  return `$${n.toFixed(0)}m`;
};

// ─── Panel wrapper ────────────────────────────────────────────────────────────
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

// ─── Headline ────────────────────────────────────────────────────────────────
function HeadlineBox({ bbg, company, ticker, livePrice }: { bbg: BloombergData | null; company: CompanyInfo | null; ticker: string; livePrice: number | null }) {
  const price = livePrice ?? bbg?.px_last ?? null;
  const ytd = toNum(bbg?.ytd_return);
  const ytdColor = ytd == null ? G.text : ytd >= 0 ? G.green : G.red;
  const ytdSign  = ytd != null && ytd >= 0 ? '+' : '';

  // Agent rating from analyst counts
  const buy   = toNum(bbg?.buy_count)  ?? 0;
  const hold  = toNum(bbg?.hold_count) ?? 0;
  const sell  = toNum(bbg?.sell_count) ?? 0;
  const total = buy + hold + sell;
  const ratingScore = total > 0 ? ((buy * 5) + (hold * 3) + (sell * 1)) / total : null;
  const ratingLabel = ratingScore == null ? '—'
    : ratingScore >= 4.5 ? 'STRONG BUY'
    : ratingScore >= 3.5 ? 'BUY'
    : ratingScore >= 2.5 ? 'HOLD' : 'SELL';
  const ratingColor = ratingScore == null ? G.muted
    : ratingScore >= 3.5 ? G.green
    : ratingScore >= 2.5 ? G.amber : G.red;

  // ADTV = avg_volume (shares) × px_last
  const vol  = toNum(bbg?.avg_volume ?? null);
  const px   = toNum(bbg?.px_last ?? null);
  const adtv = vol && px ? vol * px : null;
  const fmtAdtv = adtv == null ? '—'
    : adtv >= 1e9 ? `$${(adtv / 1e9).toFixed(2)}B`
    : adtv >= 1e6 ? `$${(adtv / 1e6).toFixed(1)}M`
    : `$${adtv.toFixed(0)}`;

  const stats: [string, string, string?][] = [
    ['Mkt Cap (USD)', fmtMktCapBn(bbg?.market_cap ?? null)],
    ['ADTV (USD)',    fmtAdtv],
    ['Agent Rating',  ratingScore != null ? `${ratingScore.toFixed(2)} ${ratingLabel}` : '—', ratingColor],
    ['Fwd P/E',      fmt(bbg?.fwd_pe, 1, 'x')],
    ['52W High',     fmt(bbg?.high_52w, 2)],
    ['52W Low',      fmt(bbg?.low_52w, 2)],
    ['YTD',          ytd != null ? `${ytdSign}${ytd.toFixed(1)}%` : '—', ytdColor],
    ['Div Yield',    fmt(bbg?.dividend_yield, 2, '%')],
    ['CEO',          bbg?.ceo_name ?? '—'],
    ['Next Earn',    bbg?.next_earnings_date ?? '—'],
  ];

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
        {livePrice && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, background: G.greenFaint, border: `1px solid ${G.greenMuted}`, borderRadius: 2, padding: '1px 6px' }}>LIVE</span>}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
        {stats.map(([k, v, c]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{k}</span>
            <span style={{ fontFamily: G.mono, fontSize: 13, color: c ?? G.text }}>{v}</span>
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

// ─── Agent Chat ───────────────────────────────────────────────────────────────
function AgentChat({ agentKey, agentName, ticker }: { agentKey: string; agentName: string; ticker: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agentKey) return;
    setMessages([]);
    const key = agentKey.toLowerCase();
    fetch(`/api/agents/${key}`, { headers: { authorization: 'Bearer fingerthumb' } })
      .then(r => r.json())
      .then(d => {
        const hist: { role: string; content: string }[] = d.thread_history ?? [];
        const recent = hist
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-8)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        setMessages(recent);
      })
      .catch(() => {});
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
        body: JSON.stringify({ agentKey: agentKey.toLowerCase(), message: q }),
      });
      const d = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: d.reply ?? d.error ?? '...' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error — check connection.' }]);
    } finally { setLoading(false); }
  }, [input, loading, agentKey]);

  const prompts = [
    `Bull case for ${ticker}?`,
    `Key risks for ${ticker}?`,
    `Latest earnings summary?`,
    `Valuation vs peers?`,
  ];

  return (
    <div style={{ background: G.surf, border: `1px solid ${G.b}`, borderRadius: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: G.surfAlt, flexShrink: 0 }}>
        <span style={{ fontFamily: G.mono, fontSize: 16, color: G.green, letterSpacing: 2 }}>AGENT · {agentKey.toUpperCase()}</span>
        <span style={{ fontFamily: G.mono, fontSize: 13, color: G.muted }}>{agentName}</span>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${G.b}`, display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        {prompts.map(p => (
          <button key={p} onClick={() => setInput(p)}
            style={{ fontFamily: G.mono, fontSize: 13, color: G.greenDim, background: G.greenFaint, border: `1px solid ${G.greenMuted}`, borderRadius: 3, padding: '5px 10px', cursor: 'pointer' }}>
            {p}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: G.mono, fontSize: 16, color: G.dim, textAlign: 'center', marginTop: 48 }}>
            Ask {agentKey.toUpperCase()} about {ticker}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '94%' }}>
            <div style={{ fontFamily: G.mono, fontSize: 13, color: G.muted, marginBottom: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
              {m.role === 'user' ? 'YOU' : agentKey.toUpperCase()}
            </div>
            <div style={{ background: m.role === 'user' ? G.greenFaint : G.surfAlt, border: `1px solid ${m.role === 'user' ? G.greenMuted : G.b}`, borderRadius: 4, padding: '10px 14px', fontFamily: G.mono, fontSize: 16, color: G.text, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontFamily: G.mono, fontSize: 13, color: G.muted, marginBottom: 4 }}>{agentKey.toUpperCase()}</div>
            <div style={{ background: G.surfAlt, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px', fontFamily: G.mono, fontSize: 18, color: G.greenDim }}>▋</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 14px', borderTop: `1px solid ${G.b}`, display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={`Ask about ${ticker}…`}
          style={{ flex: 1, fontFamily: G.mono, fontSize: 16, color: G.text, background: G.bg, border: `1px solid ${G.b}`, borderRadius: 3, padding: '10px 12px', outline: 'none' }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ fontFamily: G.mono, fontSize: 15, color: G.bg, background: loading ? G.greenMuted : G.green, border: 'none', borderRadius: 3, padding: '0 18px', cursor: loading ? 'default' : 'pointer', letterSpacing: 1 }}>
          SEND
        </button>
      </div>
    </div>
  );
}

// ─── Consensus Change ─────────────────────────────────────────────────────────
type ConsensusTab = 'EPS' | 'Revenue' | 'EBIT';

function ConsensusChangePanel({ bbg }: { bbg: BloombergData }) {
  const [tab, setTab] = useState<ConsensusTab>('EPS');

  const epsFy1Avg = toNum(bbg.consensus_eps_fy1);
  const epsFy2Avg = toNum(bbg.consensus_eps_fy2);
  const epsStd    = toNum(bbg.eps_std_dev);
  const epsRev3m  = toNum(bbg.eps_rev_3m);
  const revRev3m  = toNum(bbg.rev_rev_3m);
  const revFy1Avg = toNum(bbg.consensus_rev_fy1); // $M
  const actualEps = toNum(bbg.actual_eps_last);

  // Approximate hi/lo from ±1.5σ
  const epsFy1Hi = epsFy1Avg != null && epsStd != null ? epsFy1Avg + epsStd * 1.5 : null;
  const epsFy1Lo = epsFy1Avg != null && epsStd != null ? epsFy1Avg - epsStd * 1.5 : null;

  type Row = { label: string; currFY: string; fy1: string; fy2: string };

  const getRows = (): Row[] => {
    const fmtPct = (v: number | null) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';

    if (tab === 'EPS') {
      return [
        { label: 'High',          currFY: '—',                                          fy1: epsFy1Hi != null ? epsFy1Hi.toFixed(3) : '—', fy2: '—' },
        { label: 'Average',       currFY: actualEps != null ? actualEps.toFixed(3) : '—', fy1: epsFy1Avg != null ? epsFy1Avg.toFixed(3) : '—', fy2: epsFy2Avg != null ? epsFy2Avg.toFixed(3) : '—' },
        { label: 'Low',           currFY: '—',                                          fy1: epsFy1Lo != null ? epsFy1Lo.toFixed(3) : '—', fy2: '—' },
        { label: 'Avg 3mth chg%', currFY: '—',                                          fy1: fmtPct(epsRev3m),                                fy2: '—' },
      ];
    }
    if (tab === 'Revenue') {
      const fmtRev = (v: number | null) => v != null ? `$${(v / 1e3).toFixed(1)}B` : '—';
      return [
        { label: 'High',          currFY: '—', fy1: '—',              fy2: '—' },
        { label: 'Average',       currFY: '—', fy1: fmtRev(revFy1Avg), fy2: '—' },
        { label: 'Low',           currFY: '—', fy1: '—',              fy2: '—' },
        { label: 'Avg 3mth chg%', currFY: '—', fy1: fmtPct(revRev3m), fy2: '—' },
      ];
    }
    // EBIT — requires additional Bloomberg fields
    return [
      { label: 'High',          currFY: '—', fy1: '—', fy2: '—' },
      { label: 'Average',       currFY: '—', fy1: '—', fy2: '—' },
      { label: 'Low',           currFY: '—', fy1: '—', fy2: '—' },
      { label: 'Avg 3mth chg%', currFY: '—', fy1: '—', fy2: '—' },
    ];
  };

  const rows = getRows();
  const chgColor = (v: string) => v === '—' ? G.muted : v.startsWith('+') ? G.green : G.red;

  return (
    <Panel title="CONSENSUS CHANGE" badge="Bloomberg">
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['EPS', 'Revenue', 'EBIT'] as ConsensusTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ fontFamily: G.mono, fontSize: 11, color: tab === t ? G.bg : G.muted, background: tab === t ? G.green : G.bg, border: `1px solid ${tab === t ? G.green : G.b}`, borderRadius: 3, padding: '4px 14px', cursor: 'pointer', letterSpacing: 1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${G.b}`, borderRadius: 4, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', background: G.surfAlt, borderBottom: `1px solid ${G.b}` }}>
          <div style={{ padding: '7px 10px', fontFamily: G.mono, fontSize: 10, color: G.muted }} />
          {['Curr FY', 'FY1', 'FY2'].map(h => (
            <div key={h} style={{ padding: '7px 10px', fontFamily: G.mono, fontSize: 10, color: G.muted, textAlign: 'right', letterSpacing: 1 }}>{h}</div>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', borderBottom: i < rows.length - 1 ? `1px solid ${G.b}` : 'none', background: row.label === 'Avg 3mth chg%' ? G.greenFaint : 'transparent' }}>
            <div style={{ padding: '8px 10px', fontFamily: G.mono, fontSize: 11, color: row.label === 'Avg 3mth chg%' ? G.muted : G.text, letterSpacing: row.label === 'Avg 3mth chg%' ? 0 : 0 }}>{row.label}</div>
            {[row.currFY, row.fy1, row.fy2].map((v, j) => (
              <div key={j} style={{ padding: '8px 10px', fontFamily: G.mono, fontSize: 11, color: row.label === 'Avg 3mth chg%' ? chgColor(v) : G.text, textAlign: 'right', fontWeight: row.label === 'Average' ? 700 : 400 }}>{v}</div>
            ))}
          </div>
        ))}
      </div>

      {tab !== 'EPS' && (
        <div style={{ marginTop: 8, fontFamily: G.mono, fontSize: 10, color: G.dim }}>
          Full {tab} consensus detail (High/Low/3mth) requires extended Bloomberg sync
        </div>
      )}
    </Panel>
  );
}

// ─── Historic CAGR ────────────────────────────────────────────────────────────
function HistoricCAGRPanel() {
  const metrics = ['Revenue', 'EBIT', 'EPS'];
  const periods = ['3Y', '5Y', '10Y'];

  return (
    <Panel title="HISTORIC CAGR" badge="Bloomberg Historical">
      <div style={{ border: `1px solid ${G.b}`, borderRadius: 4, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', background: G.surfAlt, borderBottom: `1px solid ${G.b}` }}>
          <div style={{ padding: '7px 10px' }} />
          {periods.map(p => (
            <div key={p} style={{ padding: '7px 10px', fontFamily: G.mono, fontSize: 10, color: G.muted, textAlign: 'right', letterSpacing: 1 }}>{p}</div>
          ))}
        </div>
        {metrics.map((m, i) => (
          <div key={m} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', borderBottom: i < metrics.length - 1 ? `1px solid ${G.b}` : 'none' }}>
            <div style={{ padding: '8px 10px', fontFamily: G.mono, fontSize: 11, color: G.text }}>{m}</div>
            {periods.map(p => (
              <div key={p} style={{ padding: '8px 10px', fontFamily: G.mono, fontSize: 11, color: G.muted, textAlign: 'right' }}>—</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontFamily: G.mono, fontSize: 10, color: G.dim }}>
        Requires Bloomberg historical annual series — planned for next sync update
      </div>
    </Panel>
  );
}

// ─── Analyst Ratings ─────────────────────────────────────────────────────────
function AnalystRatings({ bbg }: { bbg: BloombergData }) {
  const buy   = toNum(bbg.buy_count)  ?? 0;
  const hold  = toNum(bbg.hold_count) ?? 0;
  const sell  = toNum(bbg.sell_count) ?? 0;
  const total = buy + hold + sell;
  if (total === 0) return null;

  const ratingScore = ((buy * 5) + (hold * 3) + (sell * 1)) / total;
  const ratingLabel = ratingScore >= 4.5 ? 'STRONG BUY' : ratingScore >= 3.5 ? 'BUY' : ratingScore >= 2.5 ? 'HOLD' : 'SELL';
  const ratingColor = ratingScore >= 3.5 ? G.green : ratingScore >= 2.5 ? G.amber : G.red;

  const pctN   = (n: number) => `${(n / total * 100).toFixed(1)}%`;
  const barPct = (n: number) => `${Math.round(n / total * 100)}%`;

  const px    = toNum(bbg.px_last);
  const tgtMn = toNum(bbg.target_price_mean);
  const tgtHi = toNum(bbg.target_price_high);
  const tgtLo = toNum(bbg.target_price_low);
  const retPot = px && tgtMn ? ((tgtMn - px) / px * 100) : null;

  return (
    <Panel title="ANALYST RECOMMENDATIONS" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: G.bg, border: `1px solid ${G.bBright}`, borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontFamily: G.mono, fontSize: 36, color: ratingColor, fontWeight: 700, lineHeight: 1 }}>{ratingScore.toFixed(2)}</div>
              <div style={{ fontFamily: G.mono, fontSize: 10, color: ratingColor, letterSpacing: 1, marginTop: 4 }}>{ratingLabel}</div>
            </div>
            <div style={{ fontSize: 20, color: ratingColor }}>▲</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {([['BUY', G.green, buy], ['HOLD', G.amber, hold], ['SELL', G.red, sell]] as [string, string, number][]).map(([label, col, n]) => (
              <div key={label} style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: G.mono, fontSize: 28, color: col, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: G.mono, fontSize: 9, color: G.muted, marginTop: 3, letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: G.mono, fontSize: 10, color: col, marginTop: 2 }}>{pctN(n)}</div>
              </div>
            ))}
          </div>
          {tgtMn != null && (
            <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['12M TGT PRICE',    fmt(tgtMn, 2)],
                ['TARGET HI',        fmt(tgtHi, 2)],
                ['TARGET LO',        fmt(tgtLo, 2)],
                ['LAST PRICE',       px != null ? px.toFixed(2) : '—'],
                ['RETURN POTENTIAL', retPot != null ? `${retPot >= 0 ? '+' : ''}${retPot.toFixed(1)}%` : '—'],
                ['YTD RETURN',       toNum(bbg.ytd_return) != null ? `${toNum(bbg.ytd_return)!.toFixed(1)}%` : '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{k}</span>
                  <span style={{ fontFamily: G.mono, fontSize: 13, color: k === 'RETURN POTENTIAL' ? (retPot != null && retPot >= 0 ? G.green : G.red) : G.text }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 8 }}>CONSENSUS BREAKDOWN</div>
          <div style={{ display: 'flex', height: 24, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
            <div style={{ width: barPct(buy),  background: G.green, transition: 'width 0.6s' }} title={`BUY ${pctN(buy)}`} />
            <div style={{ width: barPct(hold), background: G.amber, transition: 'width 0.6s' }} title={`HOLD ${pctN(hold)}`} />
            <div style={{ width: barPct(sell), background: G.red,   transition: 'width 0.6s' }} title={`SELL ${pctN(sell)}`} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {([['■ BUY', G.green, pctN(buy)], ['■ HOLD', G.amber, pctN(hold)], ['■ SELL', G.red, pctN(sell)]] as [string, string, string][]).map(([label, col, pct]) => (
              <span key={label} style={{ fontFamily: G.mono, fontSize: 11, color: col }}>{label} {pct}</span>
            ))}
          </div>
          {tgtMn != null && tgtLo != null && tgtHi != null && px != null && (
            <>
              <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 8 }}>TARGET PRICE RANGE vs LAST PRICE</div>
              <div style={{ position: 'relative', height: 28, marginBottom: 6 }}>
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: 4, background: G.b, borderRadius: 2, transform: 'translateY(-50%)' }} />
                {(() => {
                  const rangeMin = Math.min(tgtLo, px) * 0.9;
                  const rangeMax = Math.max(tgtHi, px) * 1.1;
                  const span = rangeMax - rangeMin;
                  const toPct = (v: number) => `${((v - rangeMin) / span * 80 + 10).toFixed(1)}%`;
                  const fillLeft  = parseFloat(toPct(tgtLo));
                  const fillRight = 100 - parseFloat(toPct(tgtHi));
                  return (
                    <>
                      <div style={{ position: 'absolute', top: '50%', left: `${fillLeft}%`, right: `${fillRight}%`, height: 4, background: G.greenMuted, borderRadius: 2, transform: 'translateY(-50%)' }} />
                      <div style={{ position: 'absolute', top: '50%', left: toPct(tgtMn), transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: G.green, border: `2px solid ${G.bg}` }} title={`Mean ${tgtMn.toFixed(2)}`} />
                      <div style={{ position: 'absolute', top: '50%', left: toPct(px), transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: G.amber, border: `2px solid ${G.bg}` }} title={`Price ${px.toFixed(2)}`} />
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: G.mono, fontSize: 10, color: G.muted }}>
                <span>Lo {fmt(tgtLo, 2)}</span>
                <span style={{ color: G.green }}>■ Mean {fmt(tgtMn, 2)}</span>
                <span style={{ color: G.amber }}>■ Price {px.toFixed(2)}</span>
                <span>Hi {fmt(tgtHi, 2)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ─── 52W Price Range ──────────────────────────────────────────────────────────
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
  const price = livePrice ?? toNum(bbg.px_last);
  const high = toNum(bbg.high_52w);
  const low  = toNum(bbg.low_52w);
  if (!high || !low) return null;
  return (
    <Panel title="52-WEEK RANGE" badge="Bloomberg">
      <RangeBar label="52W Price Range" low={low} high={high} current={price} />
      {bbg.target_price_mean != null && bbg.target_price_low != null && bbg.target_price_high != null && (
        <RangeBar
          label="Analyst Target Range"
          low={toNum(bbg.target_price_low)!}
          high={toNum(bbg.target_price_high)!}
          current={toNum(bbg.target_price_mean)}
        />
      )}
    </Panel>
  );
}

// ─── News ─────────────────────────────────────────────────────────────────────
function NewsPanel({ ticker, agentKey }: { ticker: string; agentKey: string }) {
  return (
    <Panel title="NEWS & CATALYSTS" badge="Agent Intelligence">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          'Ask the agent for the latest news and catalysts for this stock.',
          `Try: "What are the key catalysts for ${ticker} in the next 3 months?"`,
          `Or: "What has ${ticker} reported most recently?"`,
        ].map((text, i) => (
          <div key={i} style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontFamily: G.mono, fontSize: 12, color: G.greenMuted, flexShrink: 0, marginTop: 1 }}>▸</span>
            <span style={{ fontFamily: G.mono, fontSize: 12, color: i === 0 ? G.muted : G.greenDim, lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
        <div style={{ marginTop: 4, fontFamily: G.mono, fontSize: 10, color: G.dim }}>
          Live news integration powered by {agentKey.toUpperCase()} · Use the chat panel to query recent developments
        </div>
      </div>
    </Panel>
  );
}

// ─── Valuation History Chart ──────────────────────────────────────────────────
interface ValHistRow { snapshot_date: string; fwd_pe: number | null; ev_ebitda: number | null; px_last: number | null; market_cap: number | null; }

function ValuationHistoryPanel({ ticker, bbg }: { ticker: string; bbg: BloombergData }) {
  const [history, setHistory] = useState<ValHistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHistory([]); setLoading(true);
    fetch(`/api/bloomberg/valuation-history?ticker=${ticker}&limit=260`)
      .then(r => r.json())
      .then((d: ValHistRow[]) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  const currentPeY1 = toNum(bbg.fwd_pe);
  const px          = toNum(bbg.px_last);
  const epsY2       = toNum(bbg.consensus_eps_fy2);
  const currentPeY2 = px && epsY2 && epsY2 > 0 ? px / epsY2 : null;

  // 5yr range from history
  const peValues = history.map(r => toNum(r.fwd_pe)).filter((v): v is number => v != null);
  const pe5yrHi  = peValues.length > 0 ? Math.max(...peValues) : null;
  const pe5yrLo  = peValues.length > 0 ? Math.min(...peValues) : null;

  // Chart: P/E Y1 only
  const chartData = history
    .map(row => ({
      date:     new Date(row.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'P/E Y1': toNum(row.fwd_pe),
    }))
    .filter(r => r['P/E Y1'] != null);

  return (
    <Panel title="VALUATION HISTORY" badge="Weekly Snapshots">
      {/* Stat boxes */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 100px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>P/E Y1</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: G.green, fontWeight: 700 }}>
            {currentPeY1 != null ? `${currentPeY1.toFixed(1)}x` : '—'}
          </div>
        </div>
        <div style={{ flex: '1 1 100px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>P/E Y2</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: G.green, fontWeight: 700 }}>
            {currentPeY2 != null ? `${currentPeY2.toFixed(1)}x` : '—'}
          </div>
        </div>
        <div style={{ flex: '2 1 160px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>P/E 5YR RANGE</div>
          <div style={{ fontFamily: G.mono, fontSize: 18, color: G.amber, fontWeight: 700 }}>
            {pe5yrHi != null && pe5yrLo != null ? `${pe5yrLo.toFixed(1)}x – ${pe5yrHi.toFixed(1)}x` : '—'}
          </div>
          {peValues.length > 0 && (
            <div style={{ fontFamily: G.mono, fontSize: 9, color: G.dim, marginTop: 3 }}>{peValues.length} weekly snapshots</div>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: G.mono, fontSize: 12, color: G.dim }}>Loading…</span>
        </div>
      ) : chartData.length < 2 ? (
        <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4 }}>
          <span style={{ fontFamily: G.mono, fontSize: 13, color: G.muted }}>First snapshot captured today</span>
          <span style={{ fontFamily: G.mono, fontSize: 11, color: G.dim }}>Chart builds weekly — check back after Monday&apos;s Bloomberg sync</span>
        </div>
      ) : (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="2 4" stroke={G.b} />
              <XAxis dataKey="date" tick={{ fontFamily: G.mono, fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontFamily: G.mono, fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }}
                labelStyle={{ color: G.green }}
                formatter={(v: unknown) => [`${(v as number).toFixed(1)}x`, 'P/E Y1']}
              />
              <Line type="monotone" dataKey="P/E Y1" stroke={G.green} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [ticker, setTicker]             = useState('NVDA');
  const [inputVal, setInputVal]         = useState('NVDA');
  const [bbg, setBbg]                   = useState<BloombergData | null>(null);
  const [allCompanies, setAllCompanies] = useState<CompanyInfo[]>([]);
  const [company, setCompany]           = useState<CompanyInfo | null>(null);
  const [livePrice, setLivePrice]       = useState<number | null>(null);
  const [loading, setLoading]           = useState(false);
  const [notFound, setNotFound]         = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/companies', { headers: { authorization: 'Bearer fingerthumb' } })
      .then(r => r.json())
      .then((data: CompanyInfo[]) => setAllCompanies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const numFields = ['px_last','fwd_pe','ev_ebitda','consensus_eps_fy1','consensus_eps_fy2',
    'consensus_rev_fy1','target_price_mean','target_price_high','target_price_low',
    'buy_count','hold_count','sell_count','short_interest_ratio',
    'high_52w','low_52w','ytd_return','dividend_yield','market_cap','avg_volume',
    'actual_eps_last','actual_rev_last','eps_surprise_pct','rev_surprise_pct',
    'guidance_eps_hi','guidance_eps_lo','eps_rev_1m','eps_rev_3m',
    'rev_rev_1m','rev_rev_3m','est_up_1m','est_down_1m','best_eps_ntm',
    'px_to_book','median_eps_fy1','num_estimates','eps_std_dev'];

  useEffect(() => {
    if (!ticker) return;
    setLoading(true); setBbg(null); setLivePrice(null); setNotFound(false);
    Promise.all([
      fetch(`/api/bloomberg?ticker=${ticker}`).then(r => r.json()),
      fetch(`/api/price?tickers=${ticker}`).then(r => r.json()).catch(() => ({})),
    ]).then(([bbgData, priceData]) => {
      if (bbgData && !bbgData.error) {
        for (const f of numFields) {
          if (bbgData[f] != null) bbgData[f] = toNum(bbgData[f]);
        }
        setBbg(bbgData);
        setNotFound(false);
      } else {
        setBbg(null);
        setNotFound(true);
      }
      const q = priceData?.[ticker];
      if (q?.regularMarketPrice) setLivePrice(q.regularMarketPrice);
    }).finally(() => setLoading(false));
  }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allCompanies.length > 0 && ticker) {
      setCompany(allCompanies.find(c => c.ticker === ticker) ?? null);
    }
  }, [allCompanies, ticker]);

  const selectTicker = (t: string) => {
    const clean = t.trim().toUpperCase();
    setTicker(clean); setInputVal(clean); setShowDropdown(false);
  };

  const filtered = inputVal.length >= 1
    ? allCompanies.filter(c =>
        c.ticker.startsWith(inputVal.toUpperCase()) ||
        c.name.toLowerCase().includes(inputVal.toLowerCase())
      ).slice(0, 10)
    : [];

  const agentKey  = company?.agent_key  ?? 'apex';
  const agentName = company?.agent_name ?? 'Kabuten';

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: G.mono }}>

      {/* ── sticky top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: G.bg, borderBottom: `1px solid ${G.b}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: G.green, letterSpacing: 3, fontWeight: 700, flexShrink: 0 }}>ANALYTICS</span>

        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex' }}>
            <input
              value={inputVal}
              onChange={e => { setInputVal(e.target.value.toUpperCase()); setShowDropdown(true); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { selectTicker(inputVal); }
                if (e.key === 'Escape') setShowDropdown(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="SEARCH TICKER OR COMPANY"
              style={{ fontFamily: G.mono, fontSize: 12, color: G.green, background: G.surf, border: `1px solid ${G.bBright}`, borderRight: 'none', borderRadius: '3px 0 0 3px', padding: '6px 10px', width: 240, outline: 'none', letterSpacing: 1 }}
            />
            <button onClick={() => selectTicker(inputVal)}
              style={{ fontFamily: G.mono, fontSize: 11, color: G.bg, background: G.green, border: 'none', borderRadius: '0 3px 3px 0', padding: '0 14px', cursor: 'pointer', letterSpacing: 1 }}>
              LOAD
            </button>
          </div>
          {showDropdown && filtered.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '100%', background: G.surf, border: `1px solid ${G.bBright}`, borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 100, maxHeight: 320, overflowY: 'auto' }}>
              {filtered.map(c => (
                <div key={c.ticker} onMouseDown={() => selectTicker(c.ticker)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = G.greenFaint)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <span style={{ fontFamily: G.mono, fontSize: 12, color: G.green, fontWeight: 700 }}>{c.ticker}</span>
                    <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, marginLeft: 10 }}>{c.name}</span>
                  </div>
                  <span style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginLeft: 8 }}>{c.agent_key?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>Loading…</span>}
        {company && !loading && (
          <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>
            via <span style={{ color: G.greenDim }}>{agentKey.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* ── body ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* ── Agent chat: flush left, full-height sticky ── */}
        <div style={{ width: 450, flexShrink: 0, position: 'sticky', top: 54, height: 'calc(100vh - 54px)', borderRight: `1px solid ${G.b}` }}>
          <AgentChat agentKey={agentKey} agentName={agentName} ticker={ticker} />
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, minWidth: 0, padding: '20px 24px' }}>
          {notFound && !loading ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ fontFamily: G.mono, fontSize: 14, color: G.muted }}>
                No Bloomberg data for <span style={{ color: G.green }}>{ticker}</span>
              </p>
              <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, marginTop: 8 }}>
                Check that this ticker is in your coverage universe and bloomberg-sync.py has run.
              </p>
            </div>
          ) : bbg ? (
            <>
              <HeadlineBox bbg={bbg} company={company} ticker={ticker} livePrice={livePrice} />
              <ConsensusChangePanel bbg={bbg} />
              <HistoricCAGRPanel />
              <AnalystRatings bbg={bbg} />
              <ValuationHistoryPanel ticker={ticker} bbg={bbg} />
              <PriceRangePanel bbg={bbg} livePrice={livePrice} />
              <NewsPanel ticker={ticker} agentKey={agentKey} />
            </>
          ) : !loading ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ fontFamily: G.mono, fontSize: 14, color: G.muted }}>Enter a ticker above to load Bloomberg data</p>
              <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, marginTop: 8 }}>252 companies covered across 25 agents</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ fontFamily: G.mono, fontSize: 12, color: G.muted }}>Loading…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
