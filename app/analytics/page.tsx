'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── palette ────────────────────────────────────────────────────────────────
const G = {
  bg:        '#000000',
  surf:      '#080d08',
  surfAlt:   '#0d150d',
  b:         '#1a2e1a',
  bBright:   '#2a4a2a',
  green:     '#00ff41',
  greenDim:  '#00cc33',
  greenMuted:'#005515',
  greenFaint:'#001a08',
  text:      '#ccffcc',
  muted:     '#4a7a4a',
  dim:       '#2a4a2a',
  amber:     '#ffcc00',
  amberFaint:'#1a1400',
  red:       '#ff4444',
  blue:      '#4a9eff',
  purple:    '#c084fc',
  mono:      "'IBM Plex Mono','Courier New',monospace",
} as const;

// ─── mock data ───────────────────────────────────────────────────────────────
// TODO: Bloomberg — replace with real data from /api/bloomberg/[ticker]

const MOCK: Record<string, CompanyData> = {
  NVDA: {
    name: 'NVIDIA Corporation', sector: 'Semiconductors',
    price: 875.40, change: +2.34, changePct: +0.27,
    marketCap: '2.15T', pe: 35.2, fwdPe: 28.1, ev_ebitda: 22.4,
    revenueGrowth: '+122%', grossMargin: '74.6%', operatingMargin: '54.1%',
    eps_revisions: [
      { q: 'Q1\'25E', init: 4.10, curr: 5.20, dir: 'up' },
      { q: 'Q2\'25E', init: 4.40, curr: 5.65, dir: 'up' },
      { q: 'Q3\'25E', init: 4.70, curr: 6.10, dir: 'up' },
      { q: 'FY25E',   init: 17.2, curr: 22.0, dir: 'up' },
      { q: 'FY26E',   init: 20.0, curr: 27.5, dir: 'up' },
    ],
    analyst_ratings: { buy: 38, hold: 5, sell: 1, target: 1020 },
    financials: [
      { period: 'FY22', revenue: 26.9, ebitda: 10.0, net_income: 9.75 },
      { period: 'FY23', revenue: 44.9, ebitda: 22.1, net_income: 14.9 },
      { period: 'FY24', revenue: 96.3, ebitda: 55.2, net_income: 53.0 },
      { period: 'FY25E', revenue: 195.0, ebitda: 110.0, net_income: 105.0 },
    ],
    valuation: [
      { label: 'P/E (NTM)', value: 28.1, sector_avg: 22.0 },
      { label: 'EV/EBITDA', value: 22.4, sector_avg: 14.5 },
      { label: 'P/S',       value: 11.2, sector_avg: 5.8 },
      { label: 'P/FCF',     value: 34.0, sector_avg: 20.0 },
    ],
    news: [
      { date: '14 Mar', headline: 'NVIDIA announces next-gen Blackwell Ultra GPU at GTC 2025', source: 'Reuters' },
      { date: '12 Mar', headline: 'Microsoft expands Azure AI infrastructure with $1.2B NVDA order', source: 'FT' },
      { date: '10 Mar', headline: 'Goldman raises NVDA target to $1,100 on data centre demand upgrade', source: 'Bloomberg' },
      { date: '07 Mar', headline: 'China export restrictions tighten — NVDA H20 sales at risk, says analyst', source: 'WSJ' },
    ],
    agent_key: 'APEX',
  },
  ASML: {
    name: 'ASML Holding NV', sector: 'Semiconductor Equipment',
    price: 742.80, change: -4.50, changePct: -0.60,
    marketCap: '291B', pe: 32.1, fwdPe: 26.5, ev_ebitda: 19.8,
    revenueGrowth: '+14%', grossMargin: '51.3%', operatingMargin: '32.0%',
    eps_revisions: [
      { q: 'Q1\'25E', init: 5.10, curr: 4.85, dir: 'down' },
      { q: 'Q2\'25E', init: 5.60, curr: 5.40, dir: 'down' },
      { q: 'FY25E',   init: 21.5, curr: 20.8, dir: 'down' },
      { q: 'FY26E',   init: 26.0, curr: 27.2, dir: 'up' },
    ],
    analyst_ratings: { buy: 22, hold: 8, sell: 2, target: 870 },
    financials: [
      { period: 'FY22', revenue: 21.2, ebitda: 7.2, net_income: 5.6 },
      { period: 'FY23', revenue: 27.6, ebitda: 10.1, net_income: 7.8 },
      { period: 'FY24', revenue: 28.3, ebitda: 10.5, net_income: 7.8 },
      { period: 'FY25E', revenue: 32.0, ebitda: 12.4, net_income: 9.2 },
    ],
    valuation: [
      { label: 'P/E (NTM)', value: 26.5, sector_avg: 22.0 },
      { label: 'EV/EBITDA', value: 19.8, sector_avg: 14.5 },
      { label: 'P/S',       value: 8.9,  sector_avg: 5.8 },
      { label: 'P/FCF',     value: 28.0, sector_avg: 20.0 },
    ],
    news: [
      { date: '13 Mar', headline: 'ASML receives record EUV order from TSMC for 2nm node expansion', source: 'Bloomberg' },
      { date: '11 Mar', headline: 'Dutch government tightens semiconductor export rules — ASML faces uncertainty', source: 'FT' },
      { date: '09 Mar', headline: 'ASML Q1 bookings expected to re-accelerate after soft Q4', source: 'Barclays' },
    ],
    agent_key: 'FORGE',
  },
  WTC: {
    name: 'WiseTech Global Ltd', sector: 'Software',
    price: 62.45, change: +1.10, changePct: +1.79,
    marketCap: '19B', pe: 78.2, fwdPe: 58.0, ev_ebitda: 44.0,
    revenueGrowth: '+28%', grossMargin: '82.0%', operatingMargin: '24.0%',
    eps_revisions: [
      { q: 'H1 FY25E', init: 0.38, curr: 0.41, dir: 'up' },
      { q: 'FY25E',    init: 0.78, curr: 0.85, dir: 'up' },
      { q: 'FY26E',    init: 0.98, curr: 1.06, dir: 'up' },
    ],
    analyst_ratings: { buy: 10, hold: 6, sell: 3, target: 74 },
    financials: [
      { period: 'FY22', revenue: 0.64, ebitda: 0.20, net_income: 0.14 },
      { period: 'FY23', revenue: 0.85, ebitda: 0.28, net_income: 0.19 },
      { period: 'FY24', revenue: 1.04, ebitda: 0.37, net_income: 0.24 },
      { period: 'FY25E', revenue: 1.33, ebitda: 0.51, net_income: 0.32 },
    ],
    valuation: [
      { label: 'P/E (NTM)', value: 58.0, sector_avg: 30.0 },
      { label: 'EV/EBITDA', value: 44.0, sector_avg: 22.0 },
      { label: 'P/S',       value: 14.0, sector_avg: 7.0 },
      { label: 'P/FCF',     value: 62.0, sector_avg: 30.0 },
    ],
    news: [
      { date: '13 Mar', headline: 'WiseTech wins new integration contract with DB Schenker', source: 'AFR' },
      { date: '10 Mar', headline: 'CEO Richard White sells $200M stake — governance concerns resurface', source: 'AFR' },
    ],
    agent_key: 'NOVA',
  },
};

// ─── types ───────────────────────────────────────────────────────────────────
interface EpsRevision { q: string; init: number; curr: number; dir: 'up'|'down' }
interface AnalystRatings { buy: number; hold: number; sell: number; target: number }
interface Financial { period: string; revenue: number; ebitda: number; net_income: number }
interface ValuationRow { label: string; value: number; sector_avg: number }
interface NewsItem { date: string; headline: string; source: string }
interface CompanyData {
  name: string; sector: string;
  price: number; change: number; changePct: number;
  marketCap: string; pe: number; fwdPe: number; ev_ebitda: number;
  revenueGrowth: string; grossMargin: string; operatingMargin: string;
  eps_revisions: EpsRevision[];
  analyst_ratings: AnalystRatings;
  financials: Financial[];
  valuation: ValuationRow[];
  news: NewsItem[];
  agent_key: string;
}
interface ChatMessage { role: 'user'|'assistant'; content: string }

// ─── quick-ticker chips ───────────────────────────────────────────────────────
const QUICK = ['NVDA','ASML','WTC','AMAT','LRCX','TSM','KLAC','AAPL','MSFT'];

// ─── sub-components ──────────────────────────────────────────────────────────

function HeadlineBox({ data, ticker, livePrice }: { data: CompanyData; ticker: string; livePrice: number|null }) {
  const px   = livePrice ?? data.price;
  const up   = data.changePct >= 0;
  const col  = up ? G.green : G.red;
  const sign = up ? '+' : '';
  return (
    <div style={{ background: G.surf, border: `1px solid ${G.bBright}`, borderRadius: 4, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: G.mono, fontSize: 28, color: G.green, fontWeight: 700, letterSpacing: 2 }}>
          {ticker}
        </span>
        <span style={{ fontFamily: G.mono, color: G.muted, fontSize: 14 }}>
          {data.name}
        </span>
        <span style={{ fontFamily: G.mono, color: G.muted, fontSize: 13, marginLeft: 'auto' }}>
          {data.sector}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: G.mono, fontSize: 36, color: G.text, fontWeight: 700 }}>
          {px.toFixed(2)}
        </span>
        <span style={{ fontFamily: G.mono, fontSize: 18, color: col }}>
          {sign}{data.change.toFixed(2)} ({sign}{data.changePct.toFixed(2)}%)
        </span>
        {livePrice && (
          <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>LIVE</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          ['Mkt Cap',   data.marketCap],
          ['P/E',       data.pe],
          ['Fwd P/E',   data.fwdPe],
          ['EV/EBITDA', data.ev_ebitda],
          ['Rev Growth',data.revenueGrowth],
          ['Gross Mgn', data.grossMargin],
          ['Op Mgn',    data.operatingMargin],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>{k}</span>
            <span style={{ fontFamily: G.mono, fontSize: 14, color: G.text }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentChat({ data, ticker }: { data: CompanyData; ticker: string }) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [threadId, setThreadId]   = useState<string|null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // load agent thread
  useEffect(() => {
    setMessages([]);
    setThreadId(null);
    fetch(`/api/agents/${data.agent_key}`, {
      headers: { authorization: 'Bearer fingerthumb' },
    })
      .then(r => r.json())
      .then(d => {
        const msgs: ChatMessage[] = (d.messages ?? []).slice(-6).map((m: { role: string; content: string }) => ({
          role: m.role as 'user'|'assistant',
          content: m.content,
        }));
        setMessages(msgs);
        setThreadId(d.thread_id ?? null);
      })
      .catch(() => {});
  }, [data.agent_key]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ agent_key: data.agent_key, message: q, ticker, thread_id: threadId }),
      });
      const d = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: d.response ?? d.error ?? '...' }]);
      if (d.thread_id) setThreadId(d.thread_id);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error — check connection.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, data.agent_key, ticker, threadId]);

  return (
    <div style={{
      background: G.surf, border: `1px solid ${G.b}`, borderRadius: 4,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${G.b}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.green, letterSpacing: 2 }}>AGENT · {data.agent_key}</span>
        <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>ASK ANYTHING</span>
      </div>

      {/* quick prompts */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${G.b}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[`Bull case for ${ticker}?`, `Key risks for ${ticker}?`, `Latest earnings summary?`, `Valuation vs peers?`].map(p => (
          <button key={p} onClick={() => { setInput(p); }}
            style={{ fontFamily: G.mono, fontSize: 10, color: G.greenDim, background: G.greenFaint, border: `1px solid ${G.greenMuted}`,
              borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>
            {p}
          </button>
        ))}
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, textAlign: 'center', marginTop: 40 }}>
            Ask {data.agent_key} about {ticker}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '92%',
          }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>
              {m.role === 'user' ? 'YOU' : data.agent_key}
            </div>
            <div style={{
              background: m.role === 'user' ? G.greenFaint : G.surfAlt,
              border: `1px solid ${m.role === 'user' ? G.greenMuted : G.b}`,
              borderRadius: 4, padding: '8px 12px',
              fontFamily: G.mono, fontSize: 12, color: G.text, lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 3 }}>{data.agent_key}</div>
            <div style={{ background: G.surfAlt, border: `1px solid ${G.b}`, borderRadius: 4, padding: '8px 12px',
              fontFamily: G.mono, fontSize: 12, color: G.greenDim }}>
              ▋
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${G.b}`, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={`Ask about ${ticker}…`}
          style={{
            flex: 1, fontFamily: G.mono, fontSize: 12, color: G.text,
            background: G.bg, border: `1px solid ${G.b}`, borderRadius: 3,
            padding: '8px 10px', outline: 'none',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{
            fontFamily: G.mono, fontSize: 11, color: G.bg, background: loading ? G.greenMuted : G.green,
            border: 'none', borderRadius: 3, padding: '0 14px', cursor: loading ? 'default' : 'pointer',
            letterSpacing: 1,
          }}>
          SEND
        </button>
      </div>
    </div>
  );
}

function EarningsRevisions({ revisions }: { revisions: EpsRevision[] }) {
  const data = revisions.map(r => ({
    name: r.q,
    Initial: r.init,
    Current: r.curr,
    delta: ((r.curr - r.init) / r.init * 100).toFixed(1),
    dir: r.dir,
  }));
  return (
    <Panel title="EPS REVISIONS" badge="TODO: Bloomberg">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {data.map(d => (
          <div key={d.name} style={{
            flex: '1 1 80px', background: G.bg, border: `1px solid ${G.b}`,
            borderRadius: 4, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, marginBottom: 4 }}>{d.name}</div>
            <div style={{ fontFamily: G.mono, fontSize: 16, color: G.text }}>{d.Current}</div>
            <div style={{ fontFamily: G.mono, fontSize: 11, color: d.dir === 'up' ? G.green : G.red }}>
              {d.dir === 'up' ? '▲' : '▼'} {Math.abs(Number(d.delta))}%
            </div>
            <div style={{ fontFamily: G.mono, fontSize: 10, color: G.dim }}>was {d.Initial}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="2 4" stroke={G.b} vertical={false} />
            <XAxis dataKey="name" tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }}
              labelStyle={{ color: G.green }} itemStyle={{ color: G.text }} />
            <Bar dataKey="Initial" fill={G.greenMuted} radius={[2,2,0,0]} />
            <Bar dataKey="Current" fill={G.green} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function AnalystRatings({ ratings }: { ratings: AnalystRatings }) {
  const total = ratings.buy + ratings.hold + ratings.sell;
  const pct = (n: number) => `${Math.round(n/total*100)}%`;
  const barW = (n: number) => `${Math.round(n/total*100)}%`;
  return (
    <Panel title="ANALYST RATINGS" badge="TODO: Bloomberg">
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: G.mono, fontSize: 32, color: G.green, fontWeight: 700 }}>{ratings.buy}</div>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>BUY</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: G.mono, fontSize: 32, color: G.amber, fontWeight: 700 }}>{ratings.hold}</div>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>HOLD</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: G.mono, fontSize: 32, color: G.red, fontWeight: 700 }}>{ratings.sell}</div>
          <div style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, letterSpacing: 1 }}>SELL</div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, marginBottom: 2 }}>CONSENSUS TARGET</div>
          <div style={{ fontFamily: G.mono, fontSize: 24, color: G.text }}>${ratings.target}</div>
        </div>
      </div>
      {/* stacked bar */}
      <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        <div style={{ width: barW(ratings.buy), background: G.green, transition: 'width 0.5s' }} />
        <div style={{ width: barW(ratings.hold), background: G.amber, transition: 'width 0.5s' }} />
        <div style={{ width: barW(ratings.sell), background: G.red, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {[['BUY', G.green, ratings.buy], ['HOLD', G.amber, ratings.hold], ['SELL', G.red, ratings.sell]].map(([label, col, n]) => (
          <span key={label as string} style={{ fontFamily: G.mono, fontSize: 10, color: col as string }}>
            {pct(n as number)} {label}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function FinancialData({ financials }: { financials: Financial[] }) {
  return (
    <Panel title="FINANCIALS (USD BN)" badge="TODO: Bloomberg">
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financials} barGap={4}>
            <CartesianGrid strokeDasharray="2 4" stroke={G.b} vertical={false} />
            <XAxis dataKey="period" tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: G.mono, fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ background: G.surf, border: `1px solid ${G.b}`, fontFamily: G.mono, fontSize: 11 }}
              labelStyle={{ color: G.green }} itemStyle={{ color: G.text }} />
            <Bar dataKey="revenue" name="Revenue" fill={G.greenDim} radius={[2,2,0,0]} />
            <Bar dataKey="ebitda" name="EBITDA" fill={G.green} radius={[2,2,0,0]} />
            <Bar dataKey="net_income" name="Net Income" fill={G.blue} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr>
            {['Period','Revenue','EBITDA','Net Income'].map(h => (
              <th key={h} style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, textAlign: 'right', padding: '3px 8px',
                borderBottom: `1px solid ${G.b}`, letterSpacing: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {financials.map(f => (
            <tr key={f.period} style={{ borderBottom: `1px solid ${G.b}` }}>
              <td style={{ fontFamily: G.mono, fontSize: 12, color: G.green, padding: '5px 8px' }}>{f.period}</td>
              {[f.revenue, f.ebitda, f.net_income].map((v, i) => (
                <td key={i} style={{ fontFamily: G.mono, fontSize: 12, color: G.text, textAlign: 'right', padding: '5px 8px' }}>
                  {v.toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ValuationLines({ valuation }: { valuation: ValuationRow[] }) {
  const maxVal = Math.max(...valuation.flatMap(r => [r.value, r.sector_avg])) * 1.15;
  return (
    <Panel title="VALUATION VS SECTOR" badge="TODO: Bloomberg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {valuation.map(row => {
          const pct    = (row.value / maxVal * 100).toFixed(1);
          const avgPct = (row.sector_avg / maxVal * 100).toFixed(1);
          const premium = ((row.value - row.sector_avg) / row.sector_avg * 100).toFixed(0);
          const up = row.value >= row.sector_avg;
          return (
            <div key={row.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted }}>{row.label}</span>
                <span style={{ fontFamily: G.mono, fontSize: 11, color: up ? G.amber : G.green }}>
                  {up ? '+' : ''}{premium}% vs sector
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: G.bg, borderRadius: 4 }}>
                {/* sector avg tick */}
                <div style={{
                  position: 'absolute', left: `${avgPct}%`, top: -2, bottom: -2,
                  width: 2, background: G.muted, borderRadius: 1,
                }} />
                {/* company bar */}
                <div style={{
                  width: `${pct}%`, height: '100%', background: up ? G.amber : G.green,
                  borderRadius: 4, transition: 'width 0.6s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontFamily: G.mono, fontSize: 10, color: G.green }}>{row.label}: {row.value}x</span>
                <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted }}>Sector: {row.sector_avg}x</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function NewsPanel({ news }: { news: NewsItem[] }) {
  return (
    <Panel title="NEWS & EVENTS" badge="TODO: Bloomberg/Web">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {news.map((n, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, padding: '10px 0',
            borderBottom: i < news.length - 1 ? `1px solid ${G.b}` : 'none',
          }}>
            <span style={{ fontFamily: G.mono, fontSize: 11, color: G.greenDim, whiteSpace: 'nowrap', paddingTop: 1 }}>
              {n.date}
            </span>
            <span style={{ fontFamily: G.mono, fontSize: 13, color: G.text, flex: 1, lineHeight: 1.5 }}>
              {n.headline}
            </span>
            <span style={{ fontFamily: G.mono, fontSize: 10, color: G.muted, whiteSpace: 'nowrap', paddingTop: 2 }}>
              {n.source}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: G.surf, border: `1px solid ${G.b}`, borderRadius: 4,
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${G.b}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: G.surfAlt,
      }}>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.green, letterSpacing: 2 }}>{title}</span>
        {badge && (
          <span style={{ fontFamily: G.mono, fontSize: 9, color: G.muted, background: G.bg,
            border: `1px solid ${G.b}`, borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [ticker, setTicker]       = useState('NVDA');
  const [inputVal, setInputVal]   = useState('NVDA');
  const [livePrice, setLivePrice] = useState<number|null>(null);

  const data = MOCK[ticker] ?? null;

  // fetch live price
  useEffect(() => {
    setLivePrice(null);
    if (!ticker) return;
    fetch(`/api/price?tickers=${ticker}`)
      .then(r => r.json())
      .then(d => {
        const q = d[ticker];
        if (q?.regularMarketPrice) setLivePrice(q.regularMarketPrice);
      })
      .catch(() => {});
  }, [ticker]);

  const lookup = () => {
    const t = inputVal.trim().toUpperCase();
    if (t) setTicker(t);
  };

  return (
    <div style={{
      minHeight: '100vh', background: G.bg, color: G.text,
      fontFamily: G.mono,
    }}>
      {/* ── top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: G.bg, borderBottom: `1px solid ${G.b}`,
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: G.green, letterSpacing: 3, fontWeight: 700 }}>ANALYTICS</span>
        <div style={{ display: 'flex', gap: 0, flex: '0 0 auto' }}>
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="TICKER"
            style={{
              fontFamily: G.mono, fontSize: 13, color: G.green, background: G.surf,
              border: `1px solid ${G.bBright}`, borderRight: 'none',
              borderRadius: '3px 0 0 3px', padding: '6px 10px', width: 120, outline: 'none',
              letterSpacing: 2,
            }}
          />
          <button onClick={lookup} style={{
            fontFamily: G.mono, fontSize: 11, color: G.bg, background: G.green,
            border: 'none', borderRadius: '0 3px 3px 0', padding: '0 14px', cursor: 'pointer', letterSpacing: 1,
          }}>
            LOAD
          </button>
        </div>
        {/* quick chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK.map(t => (
            <button key={t} onClick={() => { setTicker(t); setInputVal(t); }}
              style={{
                fontFamily: G.mono, fontSize: 11, letterSpacing: 1,
                color: t === ticker ? G.bg : G.greenDim,
                background: t === ticker ? G.green : G.greenFaint,
                border: `1px solid ${t === ticker ? G.green : G.greenMuted}`,
                borderRadius: 3, padding: '3px 10px', cursor: 'pointer',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {!data ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ fontFamily: G.mono, fontSize: 14, color: G.muted }}>
              No mock data for <span style={{ color: G.green }}>{ticker}</span>
            </p>
            <p style={{ fontFamily: G.mono, fontSize: 12, color: G.dim, marginTop: 8 }}>
              Bloomberg integration will unlock live data for all 250+ covered companies.
            </p>
          </div>
        ) : (
          <>
            {/* headline */}
            <HeadlineBox data={data} ticker={ticker} livePrice={livePrice} />

            {/* two-column */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* left: agent chat sticky */}
              <div style={{ width: 360, flexShrink: 0, position: 'sticky', top: 60, height: 'calc(100vh - 80px)' }}>
                <AgentChat data={data} ticker={ticker} />
              </div>

              {/* right: analysis stack */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <EarningsRevisions revisions={data.eps_revisions} />
                <AnalystRatings ratings={data.analyst_ratings} />
                <FinancialData financials={data.financials} />
                <ValuationLines valuation={data.valuation} />
              </div>
            </div>

            {/* full-width news */}
            <NewsPanel news={data.news} />
          </>
        )}
      </div>
    </div>
  );
}
