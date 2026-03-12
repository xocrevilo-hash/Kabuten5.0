'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
//  MOCK DATA — shaped like Financial Datasets API
// ═══════════════════════════════════════════════════════════════

const MOCK_FACTS: Record<string, CompanyFacts> = {
  AAPL: { ticker:'AAPL', name:'Apple Inc.', sector:'Technology', industry:'Consumer Electronics',
    exchange:'NASDAQ', country:'United States', currency:'USD', market_cap:3_520_000_000_000,
    shares_outstanding:15_340_783_000, employees:161_000,
    ceo:'Tim Cook', founded:1976, website:'https://apple.com',
    description:'Apple Inc. designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories, and sells a variety of related services. Its products include iPhone, Mac, iPad, Apple Watch and AirPods.',
  },
  NVDA: { ticker:'NVDA', name:'NVIDIA Corporation', sector:'Semiconductors', industry:'Fabless Semiconductors',
    exchange:'NASDAQ', country:'United States', currency:'USD', market_cap:2_950_000_000_000,
    shares_outstanding:24_530_000_000, employees:36_000,
    ceo:'Jensen Huang', founded:1993, website:'https://nvidia.com',
    description:'NVIDIA is a global leader in accelerated computing. Its platforms power AI, data centres, professional visualisation, gaming and automotive markets. The company\'s CUDA ecosystem and GPU architecture underpin much of the world\'s AI infrastructure.',
  },
  MSFT: { ticker:'MSFT', name:'Microsoft Corporation', sector:'Technology', industry:'Software - Infrastructure',
    exchange:'NASDAQ', country:'United States', currency:'USD', market_cap:3_180_000_000_000,
    shares_outstanding:7_432_000_000, employees:228_000,
    ceo:'Satya Nadella', founded:1975, website:'https://microsoft.com',
    description:'Microsoft develops and licenses software, cloud services, hardware and services. Its three segments are Productivity & Business Processes, Intelligent Cloud and More Personal Computing. Azure is its market-leading cloud platform.',
  },
};

const MOCK_ESTIMATES: Record<string, AnalystEstimate[]> = {
  AAPL: [
    {period:'2022-Q1',eps_consensus:1.42,eps_high:1.55,eps_low:1.30,revenue_consensus:94.0,revenue_high:97.5,revenue_low:90.1,num_analysts:31},
    {period:'2022-Q2',eps_consensus:1.16,eps_high:1.22,eps_low:1.08,revenue_consensus:82.7,revenue_high:86.0,revenue_low:79.0,num_analysts:30},
    {period:'2022-Q3',eps_consensus:1.27,eps_high:1.35,eps_low:1.18,revenue_consensus:89.2,revenue_high:92.4,revenue_low:85.5,num_analysts:32},
    {period:'2022-Q4',eps_consensus:1.94,eps_high:2.05,eps_low:1.80,revenue_consensus:121.5,revenue_high:127.0,revenue_low:116.0,num_analysts:34},
    {period:'2023-Q1',eps_consensus:1.43,eps_high:1.54,eps_low:1.33,revenue_consensus:92.9,revenue_high:96.2,revenue_low:88.8,num_analysts:33},
    {period:'2023-Q2',eps_consensus:1.19,eps_high:1.27,eps_low:1.11,revenue_consensus:81.7,revenue_high:84.5,revenue_low:78.4,num_analysts:31},
    {period:'2023-Q3',eps_consensus:1.39,eps_high:1.47,eps_low:1.30,revenue_consensus:89.3,revenue_high:92.8,revenue_low:85.4,num_analysts:34},
    {period:'2023-Q4',eps_consensus:2.10,eps_high:2.22,eps_low:1.97,revenue_consensus:117.9,revenue_high:123.5,revenue_low:113.0,num_analysts:36},
    {period:'2024-Q1',eps_consensus:1.50,eps_high:1.61,eps_low:1.39,revenue_consensus:90.3,revenue_high:93.7,revenue_low:86.5,num_analysts:35},
    {period:'2024-Q2',eps_consensus:1.34,eps_high:1.43,eps_low:1.25,revenue_consensus:84.4,revenue_high:87.9,revenue_low:80.7,num_analysts:33},
    {period:'2024-Q3',eps_consensus:1.58,eps_high:1.68,eps_low:1.47,revenue_consensus:94.2,revenue_high:97.8,revenue_low:90.1,num_analysts:36},
    {period:'2024-Q4',eps_consensus:2.36,eps_high:2.50,eps_low:2.21,revenue_consensus:124.1,revenue_high:130.0,revenue_low:118.5,num_analysts:38},
  ],
  NVDA: [
    {period:'2022-Q1',eps_consensus:1.29,eps_high:1.36,eps_low:1.21,revenue_consensus:8.1,revenue_high:8.6,revenue_low:7.7,num_analysts:28},
    {period:'2022-Q2',eps_consensus:1.25,eps_high:1.35,eps_low:1.12,revenue_consensus:8.1,revenue_high:8.7,revenue_low:7.5,num_analysts:28},
    {period:'2022-Q3',eps_consensus:0.71,eps_high:0.85,eps_low:0.58,revenue_consensus:5.9,revenue_high:6.5,revenue_low:5.4,num_analysts:29},
    {period:'2022-Q4',eps_consensus:0.81,eps_high:0.92,eps_low:0.72,revenue_consensus:6.0,revenue_high:6.5,revenue_low:5.6,num_analysts:30},
    {period:'2023-Q1',eps_consensus:0.92,eps_high:1.05,eps_low:0.82,revenue_consensus:6.5,revenue_high:7.2,revenue_low:6.0,num_analysts:31},
    {period:'2023-Q2',eps_consensus:2.09,eps_high:2.30,eps_low:1.90,revenue_consensus:11.0,revenue_high:12.0,revenue_low:10.2,num_analysts:34},
    {period:'2023-Q3',eps_consensus:3.37,eps_high:3.65,eps_low:3.10,revenue_consensus:16.1,revenue_high:17.0,revenue_low:15.0,num_analysts:38},
    {period:'2023-Q4',eps_consensus:4.59,eps_high:4.90,eps_low:4.28,revenue_consensus:20.4,revenue_high:21.8,revenue_low:19.2,num_analysts:40},
    {period:'2024-Q1',eps_consensus:5.57,eps_high:5.95,eps_low:5.20,revenue_consensus:24.6,revenue_high:26.0,revenue_low:23.0,num_analysts:42},
    {period:'2024-Q2',eps_consensus:0.64,eps_high:0.70,eps_low:0.59,revenue_consensus:28.6,revenue_high:30.2,revenue_low:27.0,num_analysts:44},
    {period:'2024-Q3',eps_consensus:0.74,eps_high:0.81,eps_low:0.68,revenue_consensus:33.1,revenue_high:35.0,revenue_low:31.5,num_analysts:45},
    {period:'2024-Q4',eps_consensus:0.85,eps_high:0.94,eps_low:0.77,revenue_consensus:38.0,revenue_high:40.5,revenue_low:36.0,num_analysts:46},
  ],
  MSFT: [
    {period:'2022-Q1',eps_consensus:2.19,eps_high:2.28,eps_low:2.09,revenue_consensus:49.0,revenue_high:50.8,revenue_low:47.3,num_analysts:30},
    {period:'2022-Q2',eps_consensus:2.29,eps_high:2.40,eps_low:2.18,revenue_consensus:52.4,revenue_high:54.2,revenue_low:50.5,num_analysts:31},
    {period:'2022-Q3',eps_consensus:2.30,eps_high:2.42,eps_low:2.19,revenue_consensus:49.6,revenue_high:51.5,revenue_low:47.9,num_analysts:32},
    {period:'2022-Q4',eps_consensus:2.32,eps_high:2.44,eps_low:2.20,revenue_consensus:52.7,revenue_high:54.5,revenue_low:50.8,num_analysts:32},
    {period:'2023-Q1',eps_consensus:2.45,eps_high:2.57,eps_low:2.33,revenue_consensus:52.9,revenue_high:54.8,revenue_low:50.9,num_analysts:33},
    {period:'2023-Q2',eps_consensus:2.55,eps_high:2.68,eps_low:2.43,revenue_consensus:55.4,revenue_high:57.5,revenue_low:53.4,num_analysts:34},
    {period:'2023-Q3',eps_consensus:2.65,eps_high:2.79,eps_low:2.52,revenue_consensus:54.5,revenue_high:56.5,revenue_low:52.5,num_analysts:34},
    {period:'2023-Q4',eps_consensus:2.78,eps_high:2.93,eps_low:2.64,revenue_consensus:61.1,revenue_high:63.2,revenue_low:58.9,num_analysts:36},
    {period:'2024-Q1',eps_consensus:2.82,eps_high:2.97,eps_low:2.68,revenue_consensus:60.8,revenue_high:63.0,revenue_low:58.7,num_analysts:36},
    {period:'2024-Q2',eps_consensus:2.93,eps_high:3.08,eps_low:2.78,revenue_consensus:64.4,revenue_high:66.7,revenue_low:62.2,num_analysts:37},
    {period:'2024-Q3',eps_consensus:3.10,eps_high:3.27,eps_low:2.95,revenue_consensus:64.6,revenue_high:67.0,revenue_low:62.4,num_analysts:37},
    {period:'2024-Q4',eps_consensus:3.23,eps_high:3.41,eps_low:3.06,revenue_consensus:69.1,revenue_high:71.6,revenue_low:66.7,num_analysts:38},
  ],
};

const MOCK_NEWS: Record<string, NewsItem[]> = {
  AAPL: [
    {date:'2025-01-30',type:'earnings',tag:'8-K',title:'Apple Reports Q1 FY2025 Results — Revenue $124.3B, EPS $2.40',source:'SEC Filing',snippet:'Net sales of $124.3 billion, up 4% year over year. Services revenue reached an all-time high of $26.3 billion. EPS of $2.40 beat consensus of $2.36.'},
    {date:'2025-01-15',type:'news',tag:'NEWS',title:'Apple Vision Pro 2 Reportedly in Development for Late 2025 Launch',source:'Bloomberg',snippet:'Apple is said to be working on a second-generation spatial computing headset at a lower price point targeting broader consumer adoption.'},
    {date:'2024-11-18',type:'filing',tag:'10-K',title:'Apple Inc. Annual Report FY2024',source:'SEC EDGAR',snippet:'Annual report on Form 10-K for the fiscal year ended September 28, 2024. Total net sales $391.0B. Net income $101.0B.'},
    {date:'2024-11-01',type:'earnings',tag:'8-K',title:'Apple Reports Q4 FY2024 Results — EPS $1.64, Revenue $94.9B',source:'SEC Filing',snippet:'Revenue of $94.9 billion, up 6% year over year. iPhone revenue $46.2B. Services hit $24.9B, a new record.'},
    {date:'2024-09-10',type:'news',tag:'NEWS',title:'Apple Unveils iPhone 16 Lineup with Apple Intelligence Integration',source:'Reuters',snippet:'The new iPhone lineup places AI-driven features front and centre, with Apple Intelligence rolling out in phases across English-speaking markets.'},
    {date:'2024-08-02',type:'earnings',tag:'8-K',title:'Apple Reports Q3 FY2024 Results — Record Revenue for June Quarter',source:'SEC Filing',snippet:'Revenue $85.8 billion, up 5%. Services revenue $24.2 billion. Company announces $110 billion share buyback programme.'},
    {date:'2024-05-02',type:'earnings',tag:'8-K',title:'Apple Reports Q2 FY2024 — Services Revenue All-Time High',source:'SEC Filing',snippet:'Revenue $90.8B, up 5% YoY. Services set an all-time record at $23.9B. EPS $1.53, ahead of $1.50 consensus.'},
    {date:'2024-02-02',type:'earnings',tag:'8-K',title:'Apple Reports Q1 FY2024 — Revenue $119.6B',source:'SEC Filing',snippet:'Revenue $119.6 billion. iPhone revenue $69.7B. EPS $2.18. Company guided for low to mid single-digit YoY revenue growth for Q2 FY2024.'},
  ],
  NVDA: [
    {date:'2025-02-26',type:'earnings',tag:'8-K',title:'NVIDIA Reports Q4 FY2025 — Revenue $39.3B, Data Centre Record',source:'SEC Filing',snippet:'Record quarterly revenue of $39.3 billion, up 78% YoY. Data Centre revenue $35.6 billion. EPS $0.89 vs $0.85 consensus.'},
    {date:'2025-01-07',type:'news',tag:'NEWS',title:'NVIDIA Announces Blackwell Ultra and Next-Gen Roadmap at CES 2025',source:'Reuters',snippet:'Jensen Huang unveiled the Blackwell Ultra architecture alongside Project Digits, a personal AI supercomputer targeting developers and researchers.'},
    {date:'2024-11-20',type:'earnings',tag:'8-K',title:'NVIDIA Reports Q3 FY2025 — Revenue $35.1B, Up 94% YoY',source:'SEC Filing',snippet:'Revenue $35.1 billion, above $33.1 billion consensus. Data Centre alone contributed $30.8 billion. Gross margin 74.6%.'},
    {date:'2024-10-08',type:'news',tag:'NEWS',title:'NVIDIA H200 Supply Constraints Ease as TSMC Boosts CoWoS Capacity',source:'Bloomberg',snippet:'Production ramp of H200 accelerators is gathering pace following expanded advanced packaging capacity at TSMC\'s facilities in Taiwan.'},
    {date:'2024-08-28',type:'earnings',tag:'8-K',title:'NVIDIA Reports Q2 FY2025 — Revenue $30.0B, Up 122% YoY',source:'SEC Filing',snippet:'Data Centre revenue $26.3 billion. EPS $0.68. Blackwell GPU production ramp described as \'in full steam\'. Q3 guidance $32.5B ± 2%.'},
    {date:'2024-06-10',type:'news',tag:'NEWS',title:'NVIDIA Briefly Surpasses Microsoft as World\'s Most Valuable Company',source:'Financial Times',snippet:'NVIDIA\'s market capitalisation briefly exceeded $3.3 trillion, overtaking Microsoft and Apple in intraday trading on the back of AI infrastructure demand.'},
    {date:'2024-05-22',type:'earnings',tag:'8-K',title:'NVIDIA Reports Q1 FY2025 — Revenue $26.0B, Declares 10-for-1 Split',source:'SEC Filing',snippet:'Revenue $26.0 billion, up 262% YoY. Announces 10-for-1 forward stock split effective June 10. Quarterly dividend increased 150%.'},
    {date:'2024-02-21',type:'earnings',tag:'8-K',title:'NVIDIA Reports Q4 FY2024 — Revenue $22.1B Crushes Estimates',source:'SEC Filing',snippet:'Revenue $22.1B vs $20.6B expected. Full-year revenue $60.9B, up 122%. Data Centre surpassed $47.5B for the full year.'},
  ],
  MSFT: [
    {date:'2025-01-29',type:'earnings',tag:'8-K',title:'Microsoft Reports Q2 FY2025 — Revenue $69.6B, Azure Growth 31%',source:'SEC Filing',snippet:'Revenue $69.6 billion, up 12% YoY. Azure and other cloud services grew 31%. Intelligent Cloud segment revenue $25.5 billion. EPS $3.23.'},
    {date:'2025-01-13',type:'news',tag:'NEWS',title:'Microsoft Announces $80 Billion AI Infrastructure Investment for FY2025',source:'Bloomberg',snippet:'Microsoft plans to invest over $80 billion in data centre infrastructure this fiscal year to support AI workloads, with more than half earmarked for US facilities.'},
    {date:'2024-10-30',type:'earnings',tag:'8-K',title:'Microsoft Reports Q1 FY2025 — Revenue $65.6B, Cloud Leads Growth',source:'SEC Filing',snippet:'Revenue $65.6B, up 16%. Azure grew 33%. Copilot commercial deployments exceeded 70,000 organisations. EPS $3.30 beat $3.10 estimate.'},
    {date:'2024-07-30',type:'earnings',tag:'8-K',title:'Microsoft Reports Q4 FY2024 — Revenue $64.7B, Misses Cloud Guidance',source:'SEC Filing',snippet:'Revenue $64.7 billion, up 15%. Azure growth of 29% missed 31% guidance, sending shares lower after hours. Full year revenue $245.1B.'},
    {date:'2024-04-25',type:'earnings',tag:'8-K',title:'Microsoft Reports Q3 FY2024 — Azure Grows 31%, Beats Across the Board',source:'SEC Filing',snippet:'Revenue $61.9B, up 17%. Azure and cloud services grew 31%. Operating income $27.6B, up 23%. EPS $2.94 vs $2.82 consensus.'},
    {date:'2024-02-29',type:'news',tag:'NEWS',title:'Microsoft Becomes Most Valuable Company Globally, Surpassing Apple',source:'Financial Times',snippet:'Microsoft overtook Apple to become the world\'s most valuable listed company as AI enthusiasm drove its shares to a record close above $415.'},
    {date:'2024-01-30',type:'earnings',tag:'8-K',title:'Microsoft Reports Q2 FY2024 — Revenue $62.0B, EPS $2.93',source:'SEC Filing',snippet:'Cloud revenue $33.3 billion, up 24%. Azure grew 28%. Copilot integrations cited as early growth driver. Net income $21.9 billion.'},
  ],
};

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════

interface CompanyFacts {
  ticker: string; name: string; sector?: string; industry?: string;
  exchange?: string; country?: string; currency?: string;
  market_cap?: number; shares_outstanding?: number; employees?: number;
  ceo?: string; founded?: number; website?: string; description?: string;
  // fallback field names from API
  market_capitalization?: number; number_of_employees?: number;
}

interface AnalystEstimate {
  period: string; eps_consensus: number; eps_high: number; eps_low: number;
  revenue_consensus: number; revenue_high: number; revenue_low: number; num_analysts: number;
}

interface NewsItem {
  date: string; type: string; tag: string; title: string; source: string; snippet: string;
}

interface IncomeRow { period: string; revenue?: number; gross_profit?: number; operating_income?: number; net_income?: number; }
interface BalanceRow { period: string; total_assets?: number; total_liabilities?: number; shareholders_equity?: number; }
interface CashFlowRow { period: string; operating_cash_flow?: number; investing_cash_flow?: number; financing_cash_flow?: number; net_cash_flow_from_operations?: number; net_cash_flow_from_investing?: number; net_cash_flow_from_financing?: number; }
interface MetricRow { period_of_report?: string; report_period?: string; price_to_earnings_ratio?: number; price_to_book_ratio?: number; enterprise_value_to_ebitda_ratio?: number; price_to_sales_ratio?: number; }

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt   = (n: number | null | undefined, d = 2) => n != null ? n.toFixed(d) : '—';
const fmtB  = (n: number | null | undefined) => n == null ? '—' : Math.abs(n) >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : Math.abs(n) >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : Math.abs(n) >= 1e6 ? `$${(n/1e6).toFixed(0)}M` : `$${n.toFixed(0)}`;
const fmtMC = (n: number | null | undefined) => n == null ? '—' : n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : `$${(n/1e9).toFixed(1)}B`;
const fmtN  = (n: number | null | undefined) => n == null ? '—' : n >= 1e6 ? `${(n/1e6).toFixed(0)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);

function calcStats(arr: number[]) {
  if (!arr.length) return { mean:0, std:0, min:0, max:0 };
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  const std  = Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2,0)/arr.length);
  return { mean, std, min:Math.min(...arr), max:Math.max(...arr) };
}
function valZone(v: number, mean: number, std: number) {
  if (v > mean+std) return { label:'EXPENSIVE', color:'#f87171' };
  if (v < mean-std) return { label:'CHEAP',     color:'#4ade80' };
  return                   { label:'FAIR VALUE', color:'#f0c040' };
}

// ═══════════════════════════════════════════════════════════════
//  UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

function SecLabel({ title, sub, color = '#f0c040' }: { title: string; sub?: string; color?: string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,paddingBottom:8,borderBottom:'1px solid #1e2a3a'}}>
      <span style={{width:3,height:14,background:color,display:'inline-block',borderRadius:2}}/>
      <span style={{fontSize:10,color,letterSpacing:'.12em',fontWeight:700}}>{title}</span>
      {sub && <span style={{fontSize:9,color:'#4a5568',letterSpacing:'.06em'}}>{sub}</span>}
    </div>
  );
}

function Stat({ label, value, sub, subColor, valueColor = '#f0c040', wide = false }:
  { label: string; value: string | number; sub?: string; subColor?: string; valueColor?: string; wide?: boolean }) {
  return (
    <div style={{background:'#0d1117',border:'1px solid #1e2a3a',padding:'11px 15px',flex:wide?2:1,minWidth:wide?200:120}}>
      <div style={{fontSize:8,color:'#8b949e',letterSpacing:'.12em',marginBottom:5}}>{label}</div>
      <div style={{fontSize:16,fontWeight:700,color:valueColor,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:9,color:subColor||'#8b949e',marginTop:4}}>{sub}</div>}
    </div>
  );
}

function BloomTip({ active, payload, label, fv }: {
  active?: boolean; payload?: {name:string; value:number; color:string}[]; label?: string;
  fv?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#0d1117',border:'1px solid #f0c04044',borderRadius:3,padding:'9px 13px',fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>
      <div style={{color:'#f0c040',fontWeight:700,marginBottom:5}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color,lineHeight:'1.9'}}>
          {p.name}: <span style={{color:'#e2e8f0'}}>{fv ? fv(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string,{bg:string;border:string;text:string}> = {
    '8-K':  {bg:'#f0c04015',border:'#f0c04055',text:'#f0c040'},
    '10-K': {bg:'#60a5fa15',border:'#60a5fa55',text:'#60a5fa'},
    '10-Q': {bg:'#60a5fa15',border:'#60a5fa44',text:'#93c5fd'},
    'NEWS': {bg:'#4ade8015',border:'#4ade8044',text:'#4ade80'},
  };
  const c = colors[tag] || {bg:'#1e2a3a',border:'#2d3748',text:'#8b949e'};
  return (
    <span style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,
      fontSize:9,padding:'2px 7px',letterSpacing:'.08em',fontWeight:700,whiteSpace:'nowrap'}}>
      {tag}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════

const FREE_TICKERS = ['AAPL','GOOGL','MSFT','NVDA','TSLA'];

export default function AnalyticsPage() {
  const [ticker,    setTicker]    = useState('AAPL');
  const [inputVal,  setInputVal]  = useState('AAPL');
  const [loading,   setLoading]   = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  // Data
  const [factsData, setFactsData] = useState<CompanyFacts | null>(null);
  const [estimates, setEstimates] = useState<AnalystEstimate[]>([]);
  const [income,    setIncome]    = useState<IncomeRow[]>([]);
  const [balance,   setBalance]   = useState<BalanceRow[]>([]);
  const [cashflow,  setCashflow]  = useState<CashFlowRow[]>([]);
  const [metrics,   setMetrics]   = useState<MetricRow[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  // UI toggles
  const [estMetric,  setEstMetric]  = useState<'eps'|'revenue'|'analysts'>('eps');
  const [valMetric,  setValMetric]  = useState('pe_ratio');
  const [finTab,     setFinTab]     = useState<'income'|'balance'|'cashflow'>('income');
  const [newsFilter, setNewsFilter] = useState('ALL');

  const loadData = useCallback(async (t: string) => {
    const T = t.toUpperCase();
    setLoading(true);
    setUsingMock(false);

    try {
      // Company facts — always try live
      const factsRes = await fetch(`/api/analytics?endpoint=company/facts&ticker=${T}`);
      const factsJson = await factsRes.json();

      if (factsJson.mock) {
        // API key required — use full mock set
        setUsingMock(true);
        const m = MOCK_FACTS[T] || MOCK_FACTS.AAPL;
        setFactsData(m);
        setEstimates(MOCK_ESTIMATES[T] || MOCK_ESTIMATES.AAPL);
        setNewsItems(MOCK_NEWS[T] || MOCK_NEWS.AAPL);
        setIncome([]); setBalance([]); setCashflow([]); setMetrics([]);
        setLoading(false);
        return;
      }

      // Normalize company facts fields
      const cf = factsJson?.company_facts ?? factsJson;
      setFactsData({
        ...cf,
        market_cap: cf.market_cap ?? cf.market_capitalization,
        employees:  cf.employees  ?? cf.number_of_employees,
      });

      // Financials in parallel — work for 5 free tickers
      const [incRes, balRes, cashRes, metRes, estRes] = await Promise.all([
        fetch(`/api/analytics?endpoint=financials/income-statements&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financials/balance-sheets&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financials/cash-flow-statements&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financial-metrics&ticker=${T}&period=annual&limit=8`),
        fetch(`/api/analytics?endpoint=analyst-estimates&ticker=${T}&limit=12`),
      ]);

      const [incData, balData, cashData, metData, estData] = await Promise.all([
        incRes.json(), balRes.json(), cashRes.json(), metRes.json(), estRes.json(),
      ]);

      // Normalize period field: API returns report_period, we store as period
      const normPeriod = (r: Record<string, unknown>) => ({
        ...r,
        period: r.period_of_report ?? r.report_period ?? '',
      });

      setIncome((incData?.income_statements ?? []).map(normPeriod));
      setBalance((balData?.balance_sheets ?? []).map(normPeriod));

      // Cash flow: API uses net_cash_flow_from_* names
      setCashflow((cashData?.cash_flow_statements ?? []).map((r: Record<string,unknown>) => ({
        ...normPeriod(r),
        operating_cash_flow: r.operating_cash_flow ?? r.net_cash_flow_from_operations,
        investing_cash_flow: r.investing_cash_flow ?? r.net_cash_flow_from_investing,
        financing_cash_flow: r.financing_cash_flow ?? r.net_cash_flow_from_financing,
      })));

      setMetrics(metData?.financial_metrics ?? []);

      // Analyst estimates — needs API key; fall back to mock
      if (estData.mock || !estData?.analyst_estimates?.length) {
        setEstimates(MOCK_ESTIMATES[T] || MOCK_ESTIMATES.AAPL);
        if (estData.mock) setUsingMock(true);
      } else {
        setEstimates(estData.analyst_estimates);
      }

      // Newsflow — always mock for now
      setNewsItems(MOCK_NEWS[T] || MOCK_NEWS.AAPL);

    } catch {
      // Full fallback to mock
      setUsingMock(true);
      const m = MOCK_FACTS[T] || MOCK_FACTS.AAPL;
      setFactsData(m);
      setEstimates(MOCK_ESTIMATES[T] || MOCK_ESTIMATES.AAPL);
      setNewsItems(MOCK_NEWS[T] || MOCK_NEWS.AAPL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData('AAPL'); }, [loadData]);

  const go = () => {
    const t = inputVal.trim().toUpperCase();
    if (t) { setTicker(t); loadData(t); }
  };

  // ── Estimates chart data
  const estChart = estimates.map(e => ({
    period: e.period,
    'Consensus EPS': e.eps_consensus, 'High EPS': e.eps_high, 'Low EPS': e.eps_low,
    'Consensus Rev': e.revenue_consensus, 'High Rev': e.revenue_high, 'Low Rev': e.revenue_low,
    'Analysts': e.num_analysts,
  }));
  const latEst  = estimates.at(-1);
  const prevEst = estimates.at(-2);
  const epsChg  = latEst && prevEst ? ((latEst.eps_consensus - prevEst.eps_consensus) / Math.abs(prevEst.eps_consensus) * 100) : null;

  // ── Valuation chart data — use live annual metrics if available, else derive from estimates
  const VMAP: Record<string,string> = {
    pe_ratio: 'P/E', price_to_book: 'P/B', ev_to_ebitda: 'EV/EBITDA', price_to_sales: 'P/S',
  };
  const vField = VMAP[valMetric];
  const valChart = metrics.map(m => {
    const period = (m.period_of_report ?? m.report_period ?? '').slice(0, 7);
    return {
      date: period,
      'P/E':      m.price_to_earnings_ratio,
      'P/B':      m.price_to_book_ratio,
      'EV/EBITDA':m.enterprise_value_to_ebitda_ratio,
      'P/S':      m.price_to_sales_ratio,
    };
  });
  const vValues = valChart.map(d => d[vField as keyof typeof d] as number).filter(Boolean);
  const vStats  = calcStats(vValues);
  const latVal  = valChart.at(-1)?.[vField as keyof typeof valChart[0]] as number | undefined;
  const zone    = latVal != null ? valZone(latVal, vStats.mean, vStats.std) : null;
  const vsMean  = latVal != null ? ((latVal - vStats.mean) / vStats.mean * 100) : null;
  const yMin    = Math.max(0, Math.floor((vStats.mean - vStats.std * 2.2) * 0.9));
  const yMax    = Math.ceil((vStats.mean + vStats.std * 2.2) * 1.05);

  // ── Financials
  const FIN_INCOME_METRICS = [
    {id:'revenue',          label:'Revenue',         color:'#60a5fa'},
    {id:'gross_profit',     label:'Gross Profit',    color:'#4ade80'},
    {id:'operating_income', label:'Operating Income',color:'#f0c040'},
    {id:'net_income',       label:'Net Income',      color:'#e879f9'},
  ];
  const FIN_BALANCE_METRICS = [
    {id:'total_assets',       label:'Total Assets',      color:'#60a5fa'},
    {id:'total_liabilities',  label:'Total Liabilities', color:'#f87171'},
    {id:'shareholders_equity',label:'Equity',            color:'#4ade80'},
  ];
  const FIN_CF_METRICS = [
    {id:'operating_cash_flow', label:'Operating CF', color:'#4ade80'},
    {id:'investing_cash_flow', label:'Investing CF', color:'#f87171'},
    {id:'financing_cash_flow', label:'Financing CF', color:'#fb923c'},
  ];
  const finMetricDefs = finTab === 'income' ? FIN_INCOME_METRICS : finTab === 'balance' ? FIN_BALANCE_METRICS : FIN_CF_METRICS;

  const [finMetric, setFinMetric] = useState(FIN_INCOME_METRICS[0].id);
  const activeMetricDef = finMetricDefs.find(m => m.id === finMetric) || finMetricDefs[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finRows = (finTab === 'income' ? income : finTab === 'balance' ? balance : cashflow) as any[];

  const finChartData = (finRows as Record<string,unknown>[]).map(r => ({
    period: String(r.period ?? r.report_period ?? r.period_of_report ?? '').slice(0, 7),
    [activeMetricDef.label]: typeof r[activeMetricDef.id] === 'number' ? (r[activeMetricDef.id] as number) / 1e9 : null,
  }));

  const finTableRows: [string, string][] = finTab === 'income'
    ? [['Revenue','revenue'],['Gross Profit','gross_profit'],['Operating Income','operating_income'],['Net Income','net_income']]
    : finTab === 'balance'
    ? [['Total Assets','total_assets'],['Total Liabilities','total_liabilities'],['Equity','shareholders_equity']]
    : [['Operating CF','operating_cash_flow'],['Investing CF','investing_cash_flow'],['Financing CF','financing_cash_flow']];

  const VAL_TABS = [{id:'pe_ratio',label:'P/E'},{id:'price_to_book',label:'P/B'},{id:'ev_to_ebitda',label:'EV/EBITDA'},{id:'price_to_sales',label:'P/S'}];

  // Filtered news
  const filteredNews = newsFilter === 'ALL' ? newsItems : newsItems.filter(n => n.tag === newsFilter || n.type === newsFilter.toLowerCase());

  return (
    <div style={{background:'#0a0e17',minHeight:'100vh',color:'#c9d1d9',fontFamily:"'IBM Plex Mono','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0e17}::-webkit-scrollbar-thumb{background:#f0c04033}
        .bl-input{background:#111827;border:1px solid #1e2a3a;color:#e2e8f0;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:12px;outline:none;transition:border-color .2s}
        .bl-input:focus{border-color:#f0c040}
        .bl-btn{cursor:pointer;transition:all .15s;font-family:'IBM Plex Mono',monospace}
        .tab{background:none;border:1px solid #1e2a3a;color:#8b949e;padding:5px 13px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:'IBM Plex Mono',monospace}
        .tab:hover{border-color:#f0c04077;color:#f0c040}
        .tab.a{background:#f0c04012;border-color:#f0c040;color:#f0c040}
        .vtab{background:none;border:1px solid #1e2a3a;color:#8b949e;padding:5px 13px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:'IBM Plex Mono',monospace}
        .vtab:hover{border-color:#e879f977;color:#e879f9}
        .vtab.a{background:#e879f912;border-color:#e879f9;color:#e879f9}
        .ftab{background:none;border:1px solid #1e2a3a;color:#8b949e;padding:5px 13px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:'IBM Plex Mono',monospace}
        .ftab:hover{border-color:#60a5fa77;color:#60a5fa}
        .ftab.a{background:#60a5fa12;border-color:#60a5fa;color:#60a5fa}
        .smtab{background:none;border:1px solid #1e2a3a;color:#8b949e;padding:4px 10px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:'IBM Plex Mono',monospace}
        .smtab:hover{border-color:#f0c04055;color:#f0c040}
        .smtab.a{background:#f0c04010;border-color:#f0c04088;color:#f0c040}
        .ntab{background:none;border:1px solid #1e2a3a;color:#8b949e;padding:5px 13px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:'IBM Plex Mono',monospace}
        .ntab:hover{border-color:#4ade8077;color:#4ade80}
        .ntab.a{background:#4ade8012;border-color:#4ade80;color:#4ade80}
        tr:hover td{background:#ffffff04}
      `}</style>

      {/* ── TOP BAR */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #1e2a3a',padding:'9px 20px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:6,height:6,background:'#f0c040',borderRadius:'50%'}}/>
          <span style={{color:'#f0c040',fontWeight:700,fontSize:11,letterSpacing:'.14em'}}>BLOOMBERG-LITE  TERMINAL</span>
          <span style={{color:'#2d3748',fontSize:9,marginLeft:4}}>KABUTEN 5.0</span>
        </div>
        <div style={{display:'flex'}}>
          <input
            className="bl-input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && go()}
            placeholder="TICKER"
            style={{width:90,borderRight:'none',fontWeight:700}}
          />
          <button onClick={go} className="bl-btn" style={{background:'#f0c040',color:'#0a0e17',border:'none',padding:'8px 18px',fontWeight:700,fontSize:11,letterSpacing:'.06em'}}>
            {loading ? '…' : 'GO'}
          </button>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          {['AAPL','NVDA','MSFT','GOOGL','TSLA'].map(t => (
            <button key={t} onClick={() => { setInputVal(t); setTicker(t); loadData(t); }}
              className="bl-btn"
              style={{background:ticker===t?'#f0c04020':'none',border:`1px solid ${ticker===t?'#f0c040':'#1e2a3a'}`,
                color:ticker===t?'#f0c040':'#4a5568',padding:'3px 10px',fontSize:9,letterSpacing:'.08em'}}>
              {t}
            </button>
          ))}
          {usingMock
            ? <span style={{fontSize:9,color:'#8b949e',background:'#1e2a3a',padding:'3px 8px',letterSpacing:'.06em'}}>DEMO DATA</span>
            : <span style={{fontSize:9,color:'#4ade80',background:'#4ade8014',border:'1px solid #4ade8033',padding:'3px 8px'}}>● LIVE</span>
          }
        </div>
      </div>

      <div style={{padding:'16px 20px'}}>

        {/* ══ SECTION 1 — COMPANY FACTS */}
        {factsData && (
          <div style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:14,flexWrap:'wrap'}}>
              <div>
                <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
                  <span style={{color:'#f0c040',fontSize:26,fontWeight:700,letterSpacing:'.04em'}}>{factsData.ticker}</span>
                  <span style={{color:'#e2e8f0',fontSize:17,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:500}}>{factsData.name}</span>
                </div>
                <div style={{display:'flex',gap:8,marginTop:5,flexWrap:'wrap'}}>
                  {[factsData.exchange, factsData.sector, factsData.industry, factsData.country].filter(Boolean).map((v,i) => (
                    <span key={i} style={{fontSize:9,color:'#8b949e',background:'#1e2a3a',padding:'2px 8px',letterSpacing:'.06em'}}>{v}</span>
                  ))}
                  {(factsData.market_cap || factsData.market_capitalization) && (
                    <span style={{fontSize:9,color:'#f0c040',background:'#f0c04012',border:'1px solid #f0c04033',padding:'2px 8px',letterSpacing:'.06em'}}>
                      MKT CAP {fmtMC(factsData.market_cap ?? factsData.market_capitalization)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{marginLeft:'auto',textAlign:'right'}}>
                <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.06em'}}>SOURCE: FINANCIALDATASETS.AI  /company/facts</div>
              </div>
            </div>

            {factsData.description && (
              <div style={{background:'#0d1117',border:'1px solid #1e2a3a',padding:'12px 16px',marginBottom:10,borderLeft:'3px solid #f0c04044'}}>
                <p style={{fontSize:11,color:'#8b949e',margin:0,lineHeight:1.7,fontFamily:"'IBM Plex Sans',sans-serif"}}>{factsData.description}</p>
              </div>
            )}

            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Stat label="MARKET CAP"         value={fmtMC(factsData.market_cap ?? factsData.market_capitalization)} valueColor="#f0c040"/>
              {factsData.shares_outstanding && <Stat label="SHARES OUTSTANDING" value={fmtN(factsData.shares_outstanding)} valueColor="#60a5fa"/>}
              <Stat label="EMPLOYEES"          value={fmtN(factsData.employees ?? factsData.number_of_employees)} valueColor="#e2e8f0"/>
              <Stat label="CEO"                value={factsData.ceo || '—'}    valueColor="#e2e8f0"/>
              {factsData.founded && <Stat label="FOUNDED" value={String(factsData.founded)} valueColor="#e2e8f0"/>}
              <Stat label="EXCHANGE"           value={`${factsData.exchange ?? '—'} · ${factsData.currency ?? '—'}`} valueColor="#8b949e"/>
            </div>
          </div>
        )}

        {/* ══ SECTION 2 — ANALYST ESTIMATES */}
        {estimates.length > 0 && (
          <div style={{marginBottom:28}}>
            <SecLabel title="ANALYST ESTIMATES" sub="QUARTERLY EPS & REVENUE CONSENSUS · /analyst-estimates"/>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              <Stat label="EPS CONSENSUS"     value={latEst ? `$${fmt(latEst.eps_consensus)}` : '—'}
                    sub={epsChg != null ? `${epsChg > 0 ? '▲' : '▼'} ${Math.abs(epsChg).toFixed(1)}% QoQ` : ''}
                    subColor={epsChg != null ? (epsChg > 0 ? '#4ade80' : '#f87171') : undefined}/>
              <Stat label="EPS RANGE"         value={latEst ? `$${fmt(latEst.eps_low)} – $${fmt(latEst.eps_high)}` : '—'} sub="analyst spread"/>
              <Stat label="REVENUE CONSENSUS" value={latEst ? fmtB(latEst.revenue_consensus) : '—'}/>
              <Stat label="ANALYSTS COVERING" value={latEst?.num_analysts ?? '—'} sub={`${ticker} this quarter`}/>
            </div>
            <div style={{display:'flex',gap:5,marginBottom:10}}>
              {[{id:'eps',label:'EPS'},{id:'revenue',label:'Revenue'},{id:'analysts',label:'Coverage'}].map(t => (
                <button key={t.id} className={`tab${estMetric === t.id ? ' a' : ''}`}
                  onClick={() => setEstMetric(t.id as 'eps'|'revenue'|'analysts')}>{t.label}</button>
              ))}
            </div>
            <div style={{background:'#0d1117',border:'1px solid #1e2a3a',padding:'16px 6px 8px'}}>
              <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em',marginBottom:8,paddingLeft:10}}>
                {estMetric === 'eps' && 'EPS CONSENSUS WITH HIGH / LOW ANALYST RANGE'}
                {estMetric === 'revenue' && 'REVENUE CONSENSUS ($B) WITH HIGH / LOW RANGE'}
                {estMetric === 'analysts' && '# ANALYSTS COVERING OVER TIME'}
              </div>
              {estMetric !== 'analysts' ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={estChart} margin={{top:4,right:18,left:6,bottom:4}}>
                    <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0c040" stopOpacity={0.1}/><stop offset="100%" stopColor="#f0c040" stopOpacity={0.01}/>
                    </linearGradient></defs>
                    <CartesianGrid stroke="#1e2a3a" strokeDasharray="4 4" vertical={false}/>
                    <XAxis dataKey="period" tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}
                      tickFormatter={v => estMetric === 'revenue' ? `$${v.toFixed(0)}B` : `$${v.toFixed(2)}`}
                      width={estMetric === 'revenue' ? 50 : 40}/>
                    <Tooltip content={<BloomTip fv={v => estMetric === 'revenue' ? fmtB(v) : `$${fmt(v)}`}/>}/>
                    <Area type="monotone" dataKey={estMetric === 'eps' ? 'High EPS' : 'High Rev'} stroke="#4ade80" strokeWidth={1} strokeDasharray="3 3" fill="url(#eg)" dot={false} name="High"/>
                    <Area type="monotone" dataKey={estMetric === 'eps' ? 'Low EPS' : 'Low Rev'} stroke="#f87171" strokeWidth={1} strokeDasharray="3 3" fill="#0d1117" dot={false} name="Low"/>
                    <Line type="monotone" dataKey={estMetric === 'eps' ? 'Consensus EPS' : 'Consensus Rev'} stroke="#f0c040" strokeWidth={2.5} dot={{fill:'#f0c040',r:3,strokeWidth:0}} activeDot={{r:5}} name="Consensus"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={estChart} margin={{top:4,right:18,left:6,bottom:4}}>
                    <CartesianGrid stroke="#1e2a3a" strokeDasharray="4 4" vertical={false}/>
                    <XAxis dataKey="period" tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false} width={26}/>
                    <Tooltip content={<BloomTip fv={v => String(v)}/>}/>
                    <Bar dataKey="Analysts" fill="#a78bfa" radius={[2,2,0,0]} name="Analysts"/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ══ SECTION 3 — VALUATION */}
        {valChart.length > 0 && (
          <div style={{marginBottom:28}}>
            <SecLabel title="VALUATION METRICS" sub="TRAILING MULTIPLES · ANNUAL HISTORY · /financial-metrics" color="#e879f9"/>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              <Stat label={`CURRENT ${vField}`} value={latVal != null ? `${fmt(latVal, 1)}x` : '—'}
                    sub={zone?.label} subColor={zone?.color} valueColor={zone?.color || '#e879f9'}/>
              <Stat label="AVERAGE"    value={`${fmt(vStats.mean, 1)}x`} sub={`±${fmt(vStats.std, 1)}x std dev`} valueColor="#8b949e"/>
              <Stat label="RANGE"      value={`${fmt(vStats.min, 1)}x – ${fmt(vStats.max, 1)}x`} sub="low → high" valueColor="#8b949e"/>
              <Stat label="VS MEAN"    value={vsMean != null ? `${vsMean > 0 ? '+' : ''}${fmt(vsMean, 1)}%` : '—'}
                    sub={vsMean != null ? (vsMean > 0 ? 'above avg → stretched' : 'below avg → compressed') : ''}
                    valueColor={vsMean != null ? (vsMean > 0 ? '#f87171' : '#4ade80') : '#8b949e'}
                    subColor={vsMean != null ? (vsMean > 0 ? '#f87171' : '#4ade80') : '#8b949e'}/>
            </div>
            <div style={{display:'flex',gap:5,marginBottom:10}}>
              {VAL_TABS.map(t => (
                <button key={t.id} className={`vtab${valMetric === t.id ? ' a' : ''}`} onClick={() => setValMetric(t.id)}>{t.label}</button>
              ))}
            </div>
            <div style={{background:'#0d1117',border:'1px solid #1e2a3a',padding:'16px 6px 6px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingLeft:10,paddingRight:14,marginBottom:8}}>
                <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em'}}>TRAILING {vField} · ANNUAL HISTORY</div>
                <div style={{display:'flex',gap:12,fontSize:9}}>
                  <span style={{color:'#4ade8088'}}>▬ cheap &lt;{fmt(vStats.mean - vStats.std, 1)}x</span>
                  <span style={{color:'#f0c04088'}}>▬ fair {fmt(vStats.mean - vStats.std, 1)}–{fmt(vStats.mean + vStats.std, 1)}x</span>
                  <span style={{color:'#f8717188'}}>▬ exp. &gt;{fmt(vStats.mean + vStats.std, 1)}x</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={valChart} margin={{top:4,right:18,left:6,bottom:4}}>
                  <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e879f9" stopOpacity={0.2}/><stop offset="100%" stopColor="#e879f9" stopOpacity={0.02}/>
                  </linearGradient></defs>
                  <ReferenceArea y1={0} y2={vStats.mean - vStats.std} fill="#4ade80" fillOpacity={0.04} stroke="none"/>
                  <ReferenceArea y1={vStats.mean - vStats.std} y2={vStats.mean + vStats.std} fill="#f0c040" fillOpacity={0.04} stroke="none"/>
                  <ReferenceArea y1={vStats.mean + vStats.std} y2={yMax} fill="#f87171" fillOpacity={0.04} stroke="none"/>
                  <CartesianGrid stroke="#1e2a3a" strokeDasharray="4 4" vertical={false}/>
                  <XAxis dataKey="date" tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v.toFixed(0)}x`} width={34} domain={[yMin, yMax]}/>
                  <Tooltip content={<BloomTip fv={v => `${fmt(v, 1)}x`}/>}/>
                  <ReferenceLine y={vStats.mean} stroke="#f0c04055" strokeDasharray="6 3" strokeWidth={1}
                    label={{value:`AVG ${fmt(vStats.mean, 1)}x`,position:'insideTopRight',fill:'#f0c04088',fontSize:9,fontFamily:"'IBM Plex Mono'"}}/>
                  <ReferenceLine y={vStats.mean + vStats.std} stroke="#f8717133" strokeDasharray="3 3" strokeWidth={1}/>
                  <ReferenceLine y={vStats.mean - vStats.std} stroke="#4ade8033" strokeDasharray="3 3" strokeWidth={1}/>
                  <Area type="monotone" dataKey={vField} stroke="#e879f9" strokeWidth={2.5} fill="url(#vg)"
                    dot={false} activeDot={{r:4,fill:'#e879f9',strokeWidth:0}} name={vField}/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{paddingLeft:44,paddingTop:6,fontSize:9,color:'#2d3748'}}>
                Shaded band = ±1 standard deviation from mean · Green = cheap · Amber = fair · Red = expensive
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION 4 — FINANCIALS */}
        {(income.length > 0 || balance.length > 0 || cashflow.length > 0) && (
          <div style={{marginBottom:28}}>
            <SecLabel title="FINANCIALS" sub="ANNUAL · P&L / BALANCE SHEET / CASH FLOW · /financials" color="#60a5fa"/>

            <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
              {[{id:'income',label:'P&L'},{id:'balance',label:'Balance Sheet'},{id:'cashflow',label:'Cash Flow'}].map(t => (
                <button key={t.id} className={`ftab${finTab === t.id ? ' a' : ''}`}
                  onClick={() => { setFinTab(t.id as 'income'|'balance'|'cashflow'); setFinMetric((t.id === 'income' ? FIN_INCOME_METRICS : t.id === 'balance' ? FIN_BALANCE_METRICS : FIN_CF_METRICS)[0].id); }}>
                  {t.label}
                </button>
              ))}
              <span style={{color:'#2d3748',fontSize:9,padding:'0 4px'}}>|</span>
              {finMetricDefs.map(m => (
                <button key={m.id} className={`smtab${finMetric === m.id ? ' a' : ''}`}
                  onClick={() => setFinMetric(m.id)}
                  style={{borderColor:finMetric === m.id ? m.color+'88' : '#1e2a3a', color:finMetric === m.id ? m.color : '#8b949e'}}>
                  {m.label}
                </button>
              ))}
            </div>

            <div style={{background:'#0d1117',border:'1px solid #1e2a3a',padding:'16px 6px 8px',marginBottom:8}}>
              <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em',marginBottom:8,paddingLeft:10}}>
                {activeMetricDef.label.toUpperCase()} — ANNUAL ($B)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={finChartData} margin={{top:4,right:18,left:6,bottom:4}}>
                  <CartesianGrid stroke="#1e2a3a" strokeDasharray="4 4" vertical={false}/>
                  <XAxis dataKey="period" tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#8b949e',fontSize:9}} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${Math.abs(v).toFixed(0)}B`} width={44}/>
                  <Tooltip content={<BloomTip fv={v => `$${fmt(v, 1)}B`}/>}/>
                  <Bar dataKey={activeMetricDef.label} fill={activeMetricDef.color} radius={[3,3,0,0]} name={activeMetricDef.label}
                    label={{position:'top',fill:activeMetricDef.color,fontSize:9,formatter:(v:unknown) => typeof v === 'number' && v ? `$${fmt(v,1)}B` : ''}}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:'#0d1117',border:'1px solid #1e2a3a',overflow:'auto'}}>
              <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em',padding:'7px 14px',borderBottom:'1px solid #1e2a3a'}}>
                {finTab === 'income' ? 'INCOME STATEMENT' : finTab === 'balance' ? 'BALANCE SHEET' : 'CASH FLOW STATEMENT'} — ALL FIGURES $B
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #1e2a3a'}}>
                    <th style={{padding:'6px 14px',textAlign:'left',color:'#8b949e',fontSize:9,letterSpacing:'.08em',fontWeight:500}}>LINE ITEM</th>
                    {finRows.map((r,i) => (
                      <th key={i} style={{padding:'6px 14px',textAlign:'right',color:'#8b949e',fontSize:9,letterSpacing:'.08em',fontWeight:500}}>
                        {String(r.period ?? r.report_period ?? r.period_of_report ?? '').slice(0,7)}
                      </th>
                    ))}
                    <th style={{padding:'6px 14px',textAlign:'right',color:'#8b949e',fontSize:9,letterSpacing:'.08em',fontWeight:500}}>YoY Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {finTableRows.map(([label, key], ri) => {
                    const isHighlight = ri === 0;
                    const vals = finRows.map((r) => r[key] as number | undefined);
                    const last  = vals.at(-1);
                    const prev  = vals.at(-2);
                    const yoy   = last != null && prev != null && prev !== 0 ? ((last - prev) / Math.abs(prev) * 100) : null;
                    return (
                      <tr key={key} style={{borderBottom:'1px solid #1e2a3a0a',background:isHighlight?'#60a5fa06':'transparent'}}>
                        <td style={{padding:'6px 14px',color:isHighlight?'#60a5fa':'#8b949e',fontSize:10,fontWeight:isHighlight?600:400}}>{label}</td>
                        {vals.map((v,i) => (
                          <td key={i} style={{padding:'6px 14px',textAlign:'right',color:isHighlight?'#e2e8f0':v!=null&&v<0?'#f87171':'#c9d1d9',fontWeight:isHighlight?600:400}}>
                            {v != null ? fmtB(v) : '—'}
                          </td>
                        ))}
                        <td style={{padding:'6px 14px',textAlign:'right',color:yoy==null?'#4a5568':yoy>=0?'#4ade80':'#f87171',fontWeight:600,fontSize:10}}>
                          {yoy != null ? `${yoy >= 0 ? '+' : ''}${fmt(yoy, 1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ SECTION 5 — NEWSFLOW */}
        {newsItems.length > 0 && (
          <div style={{marginBottom:28}}>
            <SecLabel title="NEWSFLOW & FILINGS" sub="CHRONOLOGICAL · NEWS / EARNINGS / SEC FILINGS" color="#4ade80"/>
            <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
              {['ALL','NEWS','8-K','10-K','10-Q'].map(f => (
                <button key={f} className={`ntab${newsFilter === f ? ' a' : ''}`} onClick={() => setNewsFilter(f)}>{f}</button>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:0,border:'1px solid #1e2a3a'}}>
              {filteredNews.map((item, i) => (
                <div key={i} style={{
                  display:'flex',gap:14,padding:'12px 16px',
                  borderBottom: i < filteredNews.length - 1 ? '1px solid #1e2a3a0f' : 'none',
                  background: item.type === 'earnings' ? '#e879f904' : item.type === 'filing' ? '#60a5fa04' : 'transparent',
                }}>
                  <div style={{minWidth:74,paddingTop:1}}>
                    <div style={{fontSize:9,color:'#8b949e',letterSpacing:'.04em'}}>{item.date}</div>
                  </div>
                  <div style={{paddingTop:2,minWidth:42}}>
                    <TagBadge tag={item.tag}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'#e2e8f0',fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:500,marginBottom:3,lineHeight:1.4}}>
                      {item.title}
                    </div>
                    <div style={{fontSize:10,color:'#4a5568',lineHeight:1.5,fontFamily:"'IBM Plex Sans',sans-serif"}}>
                      {item.snippet}
                    </div>
                  </div>
                  <div style={{minWidth:80,textAlign:'right',paddingTop:2}}>
                    <span style={{fontSize:9,color:'#2d3748',letterSpacing:'.04em'}}>{item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{fontSize:9,color:'#1e2a3a',textAlign:'right',paddingBottom:8,letterSpacing:'.06em'}}>
          BLOOMBERG-LITE TERMINAL · KABUTEN 5.0 · POWERED BY FINANCIALDATASETS.AI
        </div>
      </div>
    </div>
  );
}
