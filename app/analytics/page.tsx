'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';

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

const fmtMktCap = (v: unknown) => {
  const n = toNum(v);
  if (n == null) return '—';
  // Bloomberg CUR_MKT_CAP is in millions
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}T`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
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
        {livePrice && <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, background: G.greenFaint, border: `1px solid ${G.greenMuted}`, borderRadius: 2, padding: '1px 6px' }}>LIVE</span>}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
        {((() => {
          // ADTV = avg_volume (shares) × px_last, in USD
          const vol = toNum(bbg?.avg_volume ?? null);
          const px  = toNum(bbg?.px_last ?? null);
          const adtv = vol && px ? vol * px : null;
          const fmtAdtv = adtv == null ? '—'
            : adtv >= 1e9 ? `$${(adtv / 1e9).toFixed(2)}B`
            : adtv >= 1e6 ? `$${(adtv / 1e6).toFixed(1)}M`
            : `$${adtv.toFixed(0)}`;
          return [
            ['Mkt Cap (USD)',  fmtMktCap(bbg?.market_cap ?? null)],
            ['ADTV (USD)',     fmtAdtv],
            ['Fwd P/E',       fmt(bbg?.fwd_pe, 1, 'x')],
            ['EV/EBITDA',     fmt(bbg?.ev_ebitda, 1, 'x')],
            ['52W High',      fmt(bbg?.high_52w, 2)],
            ['52W Low',       fmt(bbg?.low_52w, 2)],
            ['YTD',           ytd != null ? `${sign}${ytd.toFixed(1)}%` : '—'],
            ['Div Yield',     fmt(bbg?.dividend_yield, 2, '%')],
            ['Short Int',     fmt(bbg?.short_interest_ratio, 1, 'x')],
            ['Next Earn',     bbg?.next_earnings_date ?? '—'],
          ] as [string, string][];
        })()).map(([k, v]) => (
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

// ─── Agent Chat ───────────────────────────────────────────────────────────────
function AgentChat({ agentKey, agentName, ticker }: { agentKey: string; agentName: string; ticker: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load recent thread history when agent changes
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
      {/* header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: G.surfAlt, flexShrink: 0 }}>
        <span style={{ fontFamily: G.mono, fontSize: 16, color: G.green, letterSpacing: 2 }}>AGENT · {agentKey.toUpperCase()}</span>
        <span style={{ fontFamily: G.mono, fontSize: 13, color: G.muted }}>{agentName}</span>
      </div>
      {/* quick prompts */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${G.b}`, display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        {prompts.map(p => (
          <button key={p} onClick={() => setInput(p)}
            style={{ fontFamily: G.mono, fontSize: 13, color: G.greenDim, background: G.greenFaint, border: `1px solid ${G.greenMuted}`, borderRadius: 3, padding: '5px 10px', cursor: 'pointer' }}>
            {p}
          </button>
        ))}
      </div>
      {/* messages */}
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
      {/* input */}
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

// ─── EPS Revisions ───────────────────────────────────────────────────────────
function EPSRevisionsPanel({ bbg }: { bbg: BloombergData }) {
  const fy1 = toNum(bbg.consensus_eps_fy1);
  const fy2 = toNum(bbg.consensus_eps_fy2);
  const growth = fy1 && fy2 && fy1 !== 0 ? ((fy2 - fy1) / Math.abs(fy1)) * 100 : null;
  const growthUp = growth != null && growth >= 0;

  const chartData = [
    { label: 'FY1E', value: fy1 ?? 0 },
    { label: 'FY2E', value: fy2 ?? 0 },
  ];

  return (
    <Panel title="EPS REVISIONS" badge="Bloomberg Consensus">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'EPS FY1E', value: fy1, prefix: '$' },
          { label: 'EPS FY2E', value: fy2, prefix: '$' },
          { label: 'FY1→FY2 Growth', value: growth, suffix: '%', isGrowth: true },
        ].map(item => (
          <div key={item.label} style={{ flex: '1 1 100px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 6, letterSpacing: 1 }}>{item.label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 20, fontWeight: 700, color: item.isGrowth ? (growthUp ? G.green : G.red) : G.green }}>
              {item.value == null ? '—' : `${item.prefix ?? ''}${item.value.toFixed(2)}${item.suffix ?? ''}`}
            </div>
          </div>
        ))}
      </div>
      {(fy1 != null || fy2 != null) && (
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="2 4" stroke={G.b} vertical={false} />
              <XAxis dataKey="label" tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }}
                labelStyle={{ color: G.green }}
                itemStyle={{ color: G.text }}
                formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, 'EPS']}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={idx === 1 ? G.greenDim : G.green} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
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

  // Consensus rating score: Buy=5, Hold=3, Sell=1 (Bloomberg convention)
  const ratingScore = ((buy * 5) + (hold * 3) + (sell * 1)) / total;
  const ratingLabel = ratingScore >= 4.5 ? 'STRONG BUY' : ratingScore >= 3.5 ? 'BUY' : ratingScore >= 2.5 ? 'HOLD' : 'SELL';
  const ratingColor = ratingScore >= 3.5 ? G.green : ratingScore >= 2.5 ? G.amber : G.red;

  const pctN   = (n: number) => `${(n / total * 100).toFixed(1)}%`;
  const barPct = (n: number) => `${Math.round(n / total * 100)}%`;

  const px     = toNum(bbg.px_last);
  const tgtMn  = toNum(bbg.target_price_mean);
  const tgtHi  = toNum(bbg.target_price_high);
  const tgtLo  = toNum(bbg.target_price_low);
  const retPot = px && tgtMn ? ((tgtMn - px) / px * 100) : null;

  return (
    <Panel title="ANALYST RECOMMENDATIONS" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Left column: consensus stats */}
        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Rating score */}
          <div style={{ background: G.bg, border: `1px solid ${G.bBright}`, borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontFamily: G.mono, fontSize: 36, color: ratingColor, fontWeight: 700, lineHeight: 1 }}>{ratingScore.toFixed(2)}</div>
              <div style={{ fontFamily: G.mono, fontSize: 10, color: ratingColor, letterSpacing: 1, marginTop: 4 }}>{ratingLabel}</div>
            </div>
            <div style={{ fontSize: 20, color: ratingColor }}>▲</div>
          </div>
          {/* Buy / Hold / Sell counts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {([['BUY', G.green, buy], ['HOLD', G.amber, hold], ['SELL', G.red, sell]] as [string, string, number][]).map(([label, col, n]) => (
              <div key={label} style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: G.mono, fontSize: 28, color: col, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: G.mono, fontSize: 9, color: G.muted, marginTop: 3, letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: G.mono, fontSize: 10, color: col, marginTop: 2 }}>{pctN(n)}</div>
              </div>
            ))}
          </div>
          {/* Target price stats */}
          {tgtMn != null && (
            <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['12M TGT PRICE', fmt(tgtMn, 2)],
                ['TARGET HI',     fmt(tgtHi, 2)],
                ['TARGET LO',     fmt(tgtLo, 2)],
                ['LAST PRICE',    px != null ? px.toFixed(2) : '—'],
                ['RETURN POTENTIAL', retPot != null ? `${retPot >= 0 ? '+' : ''}${retPot.toFixed(1)}%` : '—'],
                ['LTM RETURN',    toNum(bbg.ytd_return) != null ? `${toNum(bbg.ytd_return)!.toFixed(1)}%` : '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{k}</span>
                  <span style={{ fontFamily: G.mono, fontSize: 13, color: k === 'RETURN POTENTIAL' ? (retPot != null && retPot >= 0 ? G.green : G.red) : G.text }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: stacked bar chart */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
          {/* current snapshot stacked bar */}
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 8 }}>CONSENSUS BREAKDOWN</div>
          <div style={{ display: 'flex', height: 24, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
            <div style={{ width: barPct(buy),  background: G.green,  transition: 'width 0.6s' }} title={`BUY ${pctN(buy)}`} />
            <div style={{ width: barPct(hold), background: G.amber, transition: 'width 0.6s' }} title={`HOLD ${pctN(hold)}`} />
            <div style={{ width: barPct(sell), background: G.red,   transition: 'width 0.6s' }} title={`SELL ${pctN(sell)}`} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {([['■ BUY', G.green, pctN(buy)], ['■ HOLD', G.amber, pctN(hold)], ['■ SELL', G.red, pctN(sell)]] as [string,string,string][]).map(([label, col, pct]) => (
              <span key={label} style={{ fontFamily: G.mono, fontSize: 11, color: col }}>{label} {pct}</span>
            ))}
          </div>
          {/* 52W target range bar */}
          {tgtMn != null && tgtLo != null && tgtHi != null && px != null && (
            <>
              <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 8 }}>TARGET PRICE RANGE vs LAST PRICE</div>
              <div style={{ position: 'relative', height: 28, marginBottom: 6 }}>
                {/* range track */}
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: 4, background: G.b, borderRadius: 2, transform: 'translateY(-50%)' }} />
                {/* filled range between lo and hi */}
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
                      {/* mean target */}
                      <div style={{ position: 'absolute', top: '50%', left: toPct(tgtMn), transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: G.green, border: `2px solid ${G.bg}` }} title={`Mean ${tgtMn.toFixed(2)}`} />
                      {/* last price */}
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

// ─── Financials ───────────────────────────────────────────────────────────────
function FinancialsPanel({ bbg }: { bbg: BloombergData }) {
  const revFy1 = toNum(bbg.consensus_rev_fy1); // Bloomberg returns in $M
  const mktCap = toNum(bbg.market_cap);         // Bloomberg CUR_MKT_CAP in $M
  const eps1   = toNum(bbg.consensus_eps_fy1);
  const eps2   = toNum(bbg.consensus_eps_fy2);

  const rows = [
    { label: 'Revenue FY1E',   value: revFy1 != null ? `$${(revFy1 / 1e3).toFixed(1)}B` : '—',       note: 'Consensus estimate' },
    { label: 'Market Cap',     value: mktCap != null ? `$${(mktCap / 1e3).toFixed(1)}B` : '—',        note: 'Bloomberg CUR_MKT_CAP' },
    { label: 'EPS FY1E',       value: eps1 != null ? `$${eps1.toFixed(2)}` : '—',                     note: 'Consensus EPS' },
    { label: 'EPS FY2E',       value: eps2 != null ? `$${eps2.toFixed(2)}` : '—',                     note: 'Next year consensus' },
    { label: 'Dividend Yield', value: fmt(bbg.dividend_yield, 2, '%'),                                note: 'Indicated yield' },
    { label: 'YTD Return',     value: toNum(bbg.ytd_return) != null ? `${toNum(bbg.ytd_return)!.toFixed(1)}%` : '—', note: 'Year-to-date' },
  ];

  return (
    <Panel title="FINANCIALS" badge="Bloomberg">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {rows.map(r => (
          <div key={r.label} style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>{r.label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 18, color: G.text, fontWeight: 700 }}>{r.value}</div>
            <div style={{ fontFamily: G.mono, fontSize: 9, color: G.dim, marginTop: 3 }}>{r.note}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Valuation ───────────────────────────────────────────────────────────────
function ValuationPanel({ bbg }: { bbg: BloombergData }) {
  const rows = [
    { label: 'Fwd P/E',   value: toNum(bbg.fwd_pe),   color: G.green },
    { label: 'EV/EBITDA', value: toNum(bbg.ev_ebitda), color: G.blue },
  ].filter(r => r.value != null);
  if (rows.length === 0) return null;
  const rawMax = Math.max(...rows.map(r => r.value!)) * 1.25;
  const maxVal = Math.ceil(rawMax / 5) * 5;
  return (
    <Panel title="VALUATION MULTIPLES" badge="Bloomberg">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {rows.map(r => (
          <div key={r.label} style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>{r.label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 26, color: r.color, fontWeight: 700 }}>{r.value!.toFixed(1)}x</div>
          </div>
        ))}
        {toNum(bbg.short_interest_ratio) != null && (
          <div style={{ flex: '1 1 120px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>SHORT INT RATIO</div>
            <div style={{ fontFamily: G.mono, fontSize: 26, color: G.amber, fontWeight: 700 }}>{toNum(bbg.short_interest_ratio)!.toFixed(1)}x</div>
          </div>
        )}
      </div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.map(r => ({ name: r.label, value: r.value, color: r.color }))} layout="vertical">
            <CartesianGrid strokeDasharray="2 4" stroke={G.b} horizontal={false} />
            <XAxis type="number" domain={[0, maxVal]} tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }}
              labelStyle={{ color: G.green }}
              itemStyle={{ color: G.text }}
              formatter={(v: unknown) => [`${(v as number).toFixed(1)}x`, '']}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {rows.map((r, idx) => <Cell key={idx} fill={r.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

// ─── News placeholder ─────────────────────────────────────────────────────────
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

// ─── Earnings Actuals vs Consensus ───────────────────────────────────────────
function EarningsActualsPanel({ bbg }: { bbg: BloombergData }) {
  const actualEps = toNum(bbg.actual_eps_last);
  const actualRev = toNum(bbg.actual_rev_last); // $M
  const epsSurp   = toNum(bbg.eps_surprise_pct);
  const revSurp   = toNum(bbg.rev_surprise_pct);
  const consEps   = toNum(bbg.consensus_eps_fy1);
  const consRev   = toNum(bbg.consensus_rev_fy1); // $M
  const guidHi    = toNum(bbg.guidance_eps_hi);
  const guidLo    = toNum(bbg.guidance_eps_lo);

  // Don't render if no actuals data at all
  if (actualEps == null && actualRev == null) return null;

  const surpriseColor = (v: number | null) => v == null ? G.muted : v >= 0 ? G.green : G.red;
  const surpriseSign  = (v: number | null) => v != null && v >= 0 ? '+' : '';

  return (
    <Panel title="LAST EARNINGS · ACTUALS VS CONSENSUS" badge={bbg.last_report_date ?? 'Bloomberg'}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {/* EPS actual */}
        <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>ACTUAL EPS</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: G.text, fontWeight: 700 }}>
            {actualEps != null ? `$${actualEps.toFixed(2)}` : '—'}
          </div>
          {consEps != null && <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginTop: 3 }}>Est ${consEps.toFixed(2)}</div>}
        </div>
        {/* EPS surprise */}
        <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>EPS SURPRISE</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: surpriseColor(epsSurp), fontWeight: 700 }}>
            {epsSurp != null ? `${surpriseSign(epsSurp)}${epsSurp.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginTop: 3 }}>vs consensus</div>
        </div>
        {/* Revenue actual */}
        <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>ACTUAL REVENUE</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: G.text, fontWeight: 700 }}>
            {actualRev != null ? `$${(actualRev / 1e3).toFixed(1)}B` : '—'}
          </div>
          {consRev != null && <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginTop: 3 }}>Est ${(consRev / 1e3).toFixed(1)}B</div>}
        </div>
        {/* Rev surprise */}
        <div style={{ background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>REV SURPRISE</div>
          <div style={{ fontFamily: G.mono, fontSize: 22, color: surpriseColor(revSurp), fontWeight: 700 }}>
            {revSurp != null ? `${surpriseSign(revSurp)}${revSurp.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginTop: 3 }}>vs consensus</div>
        </div>
        {/* Guidance (US names only) */}
        {(guidHi != null || guidLo != null) && (
          <div style={{ background: G.bg, border: `1px solid ${G.greenMuted}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.greenDim, marginBottom: 4, letterSpacing: 1 }}>EPS GUIDANCE</div>
            <div style={{ fontFamily: G.mono, fontSize: 18, color: G.green, fontWeight: 700 }}>
              {guidLo != null ? `$${guidLo.toFixed(2)}` : '—'} – {guidHi != null ? `$${guidHi.toFixed(2)}` : '—'}
            </div>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim, marginTop: 3 }}>Company guidance range</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── EPS Revision Momentum ────────────────────────────────────────────────────
function RevisionMomentumPanel({ bbg }: { bbg: BloombergData }) {
  const epsRev1m = toNum(bbg.eps_rev_1m);
  const epsRev3m = toNum(bbg.eps_rev_3m);
  const revRev1m = toNum(bbg.rev_rev_1m);
  const revRev3m = toNum(bbg.rev_rev_3m);
  const estUp    = toNum(bbg.est_up_1m);
  const estDown  = toNum(bbg.est_down_1m);
  const epsFy1   = toNum(bbg.consensus_eps_fy1);
  const epsFy2   = toNum(bbg.consensus_eps_fy2);
  const epsNtm   = toNum(bbg.best_eps_ntm);

  if (epsRev1m == null && epsRev3m == null && epsFy1 == null) return null;

  const col  = (v: number | null) => v == null ? G.muted : v > 0 ? G.green : v < 0 ? G.red : G.muted;
  const sign = (v: number | null) => v != null && v > 0 ? '+' : '';

  // centre-zero momentum bar
  const MomentumBar = ({ v }: { v: number | null }) => {
    if (v == null) return <div style={{ flex: 1 }} />;
    const clamped = Math.min(Math.abs(v), 25); // cap at 25% for display
    return (
      <div style={{ flex: 1, position: 'relative', height: 8, background: G.b, borderRadius: 4, alignSelf: 'center' }}>
        <div style={{
          position: 'absolute',
          left:  v >= 0 ? '50%' : `${Math.max(0, 50 - clamped * 2)}%`,
          width: `${clamped * 2}%`,
          height: '100%',
          background: col(v),
          borderRadius: 4,
        }} />
        <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 12, background: G.bBright }} />
      </div>
    );
  };

  return (
    <Panel title="ESTIMATE CONSENSUS DETAIL" badge="Bloomberg">
      {/* Consensus summary table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 0, borderTop: `1px solid ${G.b}` }}>
          {/* header */}
          <div style={{ padding: '6px 8px', fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }} />
          <div style={{ padding: '6px 8px', fontFamily: G.mono, fontSize: 10, color: G.muted, textAlign: 'right', letterSpacing: 1 }}>FY1 (EPS)</div>
          <div style={{ padding: '6px 8px', fontFamily: G.mono, fontSize: 10, color: G.muted, textAlign: 'right', letterSpacing: 1 }}>FY2 (EPS)</div>

          {([
            ['Mean Consensus',    epsFy1,  epsFy2],
            ['NTM Consensus',     epsNtm,  null],
          ] as [string, number | null, number | null][]).map(([label, v1, v2]) => (
            <><div key={label + 'l'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.text }}>{label}</div>
            <div key={label + 'v1'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.green, textAlign: 'right' }}>{v1 != null ? v1.toFixed(3) : '—'}</div>
            <div key={label + 'v2'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.greenDim, textAlign: 'right' }}>{v2 != null ? v2.toFixed(3) : '—'}</div></>
          ))}

          {/* revision rows */}
          {([
            ['4W Change %',    epsRev1m, null],
          ] as [string, number | null, number | null][]).map(([label, v1, v2]) => (
            <><div key={label + 'l'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.muted }}>{label}</div>
            <div key={label + 'v1'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: col(v1), textAlign: 'right' }}>{v1 != null ? `${sign(v1)}${v1.toFixed(2)}%` : '—'}</div>
            <div key={label + 'v2'} style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.muted, textAlign: 'right' }}>{v2 != null ? v2.toFixed(2) : '—'}</div></>
          ))}

          {/* up/down */}
          <div style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, color: G.muted }}>4W Up/Down</div>
          <div style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11, textAlign: 'right' }}>
            <span style={{ color: G.green }}>{estUp ?? '—'}</span><span style={{ color: G.muted }}>/</span><span style={{ color: G.red }}>{estDown ?? '—'}</span>
          </div>
          <div style={{ padding: '7px 8px', borderTop: `1px solid ${G.b}` }} />
        </div>
      </div>

      {/* Momentum bars */}
      <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 8 }}>REVISION MOMENTUM</div>
      {([
        ['EPS  · 1M vs 3M', epsRev1m, epsRev3m],
        ['REV  · 1M vs 3M', revRev1m, revRev3m],
      ] as [string, number | null, number | null][]).map(([label, v1m, v3m]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, width: 120, flexShrink: 0, letterSpacing: 1 }}>{label}</div>
          <div style={{ fontFamily: G.mono, fontSize: 13, color: col(v1m), width: 58, textAlign: 'right', flexShrink: 0 }}>
            {v1m != null ? `${sign(v1m)}${v1m.toFixed(1)}%` : '—'}
          </div>
          <MomentumBar v={v1m} />
          <div style={{ fontFamily: G.mono, fontSize: 13, color: col(v3m), width: 58, textAlign: 'right', flexShrink: 0 }}>
            {v3m != null ? `${sign(v3m)}${v3m.toFixed(1)}%` : '—'}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontFamily: G.mono, fontSize: 10, color: G.dim }}>
        <span style={{ width: 120, flexShrink: 0 }} />
        <span style={{ width: 58, textAlign: 'right' }}>1M</span>
        <div style={{ flex: 1 }} />
        <span style={{ width: 58, textAlign: 'right' }}>3M</span>
      </div>
    </Panel>
  );
}

// ─── Valuation History Chart ──────────────────────────────────────────────────
interface ValHistRow { snapshot_date: string; fwd_pe: number | null; ev_ebitda: number | null; px_last: number | null; }

function ValuationHistoryPanel({ ticker, bbg }: { ticker: string; bbg: BloombergData }) {
  const [history, setHistory] = useState<ValHistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHistory([]); setLoading(true);
    fetch(`/api/bloomberg/valuation-history?ticker=${ticker}&limit=104`)
      .then(r => r.json())
      .then((d: ValHistRow[]) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  const currentPe    = toNum(bbg.fwd_pe);
  const currentEv    = toNum(bbg.ev_ebitda);
  const currentPrice = toNum(bbg.px_last);

  // Chart data: map dates to readable labels
  const chartData = history.map(row => ({
    date: new Date(row.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Fwd P/E':    toNum(row.fwd_pe),
    'EV/EBITDA':  toNum(row.ev_ebitda),
  })).filter(r => r['Fwd P/E'] != null || r['EV/EBITDA'] != null);

  return (
    <Panel title="VALUATION HISTORY" badge="Weekly Snapshots">
      {/* Current values */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          ['Fwd P/E',   currentPe,    G.green],
          ['EV/EBITDA', currentEv,    G.blue],
          ['Last Price',currentPrice, G.amber],
        ] as [string, number | null, string][]).map(([label, val, col]) => (
          <div key={label} style={{ flex: '1 1 100px', background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4, padding: '10px 14px' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>{label}</div>
            <div style={{ fontFamily: G.mono, fontSize: 22, color: col, fontWeight: 700 }}>
              {val != null ? (label === 'Last Price' ? val.toFixed(2) : `${val.toFixed(1)}x`) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Chart or placeholder */}
      {loading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: G.mono, fontSize: 12, color: G.dim }}>Loading…</span>
        </div>
      ) : chartData.length < 2 ? (
        <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: G.bg, border: `1px solid ${G.b}`, borderRadius: 4 }}>
          <span style={{ fontFamily: G.mono, fontSize: 13, color: G.muted }}>First snapshot captured today</span>
          <span style={{ fontFamily: G.mono, fontSize: 11, color: G.dim }}>Chart builds weekly — check back after Monday's Bloomberg sync</span>
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
                formatter={(v: unknown) => [`${(v as number).toFixed(1)}x`, '']}
              />
              <Legend wrapperStyle={{ fontFamily: G.mono, fontSize: 10, color: G.muted }} />
              <Line type="monotone" dataKey="Fwd P/E"   stroke={G.green} dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="EV/EBITDA" stroke={G.blue}  dot={false} strokeWidth={1.5} />
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

  // Load all companies once
  useEffect(() => {
    fetch('/api/companies', { headers: { authorization: 'Bearer fingerthumb' } })
      .then(r => r.json())
      .then((data: CompanyInfo[]) => setAllCompanies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
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

  // Update company when allCompanies loads or ticker changes
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

        {/* search with autocomplete */}
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
          {/* autocomplete dropdown */}
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

      {/* ── body: chat far-left + scrollable right panel ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* ── Agent chat: flush left, full-height sticky ── */}
        <div style={{ width: 450, flexShrink: 0, position: 'sticky', top: 54, height: 'calc(100vh - 54px)', borderRight: `1px solid ${G.b}` }}>
          <AgentChat agentKey={agentKey} agentName={agentName} ticker={ticker} />
        </div>

        {/* ── Right: headline + analysis stack ── */}
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
              <EarningsActualsPanel bbg={bbg} />
              <RevisionMomentumPanel bbg={bbg} />
              <EPSRevisionsPanel bbg={bbg} />
              <AnalystRatings bbg={bbg} />
              <ValuationHistoryPanel ticker={ticker} bbg={bbg} />
              <FinancialsPanel bbg={bbg} />
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
