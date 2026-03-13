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

// Annual FY estimates: [current FY, next FY]
const MOCK_ESTIMATES: Record<string, AnalystEstimate[]> = {
  AAPL: [
    {period:'FY2025',eps_consensus:7.35,eps_median:7.30,eps_high:7.70,eps_low:7.05,eps_stddev:0.18,wk4_change:0.08,wk4_up:14,wk4_down:4,revenue_consensus:411.0,revenue_high:425.0,revenue_low:398.0,num_analysts:42,est_pe:30.2},
    {period:'FY2026',eps_consensus:8.22,eps_median:8.18,eps_high:8.65,eps_low:7.85,eps_stddev:0.22,wk4_change:0.12,wk4_up:18,wk4_down:3,revenue_consensus:447.0,revenue_high:468.0,revenue_low:430.0,num_analysts:39,est_pe:27.1},
  ],
  NVDA: [
    {period:'FY2027',eps_consensus:8.31,eps_median:8.11,eps_high:9.90,eps_low:7.62,eps_stddev:0.496,wk4_change:0.572,wk4_up:53,wk4_down:10,revenue_consensus:195.0,revenue_high:212.0,revenue_low:180.0,num_analysts:49,est_pe:22.2},
    {period:'FY2028',eps_consensus:10.88,eps_median:10.60,eps_high:13.85,eps_low:8.23,eps_stddev:1.095,wk4_change:0.886,wk4_up:41,wk4_down:8,revenue_consensus:252.0,revenue_high:282.0,revenue_low:225.0,num_analysts:47,est_pe:16.9},
  ],
  MSFT: [
    {period:'FY2025',eps_consensus:13.18,eps_median:13.20,eps_high:13.55,eps_low:12.80,eps_stddev:0.19,wk4_change:0.15,wk4_up:22,wk4_down:5,revenue_consensus:279.0,revenue_high:285.0,revenue_low:273.0,num_analysts:44,est_pe:29.4},
    {period:'FY2026',eps_consensus:15.48,eps_median:15.50,eps_high:16.10,eps_low:14.90,eps_stddev:0.31,wk4_change:0.18,wk4_up:26,wk4_down:4,revenue_consensus:318.0,revenue_high:330.0,revenue_low:308.0,num_analysts:42,est_pe:25.0},
  ],
  GOOGL: [
    {period:'FY2025',eps_consensus:8.95,eps_median:8.90,eps_high:9.40,eps_low:8.55,eps_stddev:0.21,wk4_change:0.10,wk4_up:19,wk4_down:6,revenue_consensus:369.0,revenue_high:382.0,revenue_low:358.0,num_analysts:46,est_pe:20.1},
    {period:'FY2026',eps_consensus:10.42,eps_median:10.35,eps_high:11.00,eps_low:9.90,eps_stddev:0.28,wk4_change:0.14,wk4_up:21,wk4_down:5,revenue_consensus:415.0,revenue_high:432.0,revenue_low:400.0,num_analysts:43,est_pe:17.3},
  ],
  TSLA: [
    {period:'FY2025',eps_consensus:2.84,eps_median:2.70,eps_high:3.50,eps_low:1.80,eps_stddev:0.48,wk4_change:-0.22,wk4_up:8,wk4_down:19,revenue_consensus:113.0,revenue_high:128.0,revenue_low:98.0,num_analysts:38,est_pe:104.6},
    {period:'FY2026',eps_consensus:4.45,eps_median:4.20,eps_high:5.80,eps_low:2.90,eps_stddev:0.82,wk4_change:-0.35,wk4_up:9,wk4_down:17,revenue_consensus:148.0,revenue_high:175.0,revenue_low:120.0,num_analysts:36,est_pe:66.9},
  ],
};

// EPS revision history — monthly consensus snapshots for the line chart
const MOCK_REVISION_HISTORY: Record<string, RevisionPoint[]> = {
  AAPL: [
    {date:'Jan 24',curFY:6.62,nxtFY:7.45},{date:'Mar 24',curFY:6.70,nxtFY:7.52},{date:'May 24',curFY:6.75,nxtFY:7.58},
    {date:'Jul 24',curFY:6.88,nxtFY:7.72},{date:'Sep 24',curFY:7.05,nxtFY:7.85},{date:'Nov 24',curFY:7.18,nxtFY:7.98},
    {date:'Jan 25',curFY:7.22,nxtFY:8.05},{date:'Mar 25',curFY:7.28,nxtFY:8.12},{date:'May 25',curFY:7.31,nxtFY:8.16},
    {date:'Jul 25',curFY:7.33,nxtFY:8.18},{date:'Sep 25',curFY:7.35,nxtFY:8.20},{date:'Nov 25',curFY:7.35,nxtFY:8.21},
    {date:'Jan 26',curFY:7.35,nxtFY:8.22},{date:'Mar 26',curFY:7.35,nxtFY:8.22},
  ],
  NVDA: [
    {date:'Jan 22',curFY:0.32,nxtFY:null},{date:'Jul 22',curFY:0.35,nxtFY:null},
    {date:'Jan 23',curFY:0.88,nxtFY:1.10},{date:'Apr 23',curFY:1.65,nxtFY:2.20},{date:'Jul 23',curFY:2.80,nxtFY:3.90},
    {date:'Oct 23',curFY:3.40,nxtFY:4.60},{date:'Jan 24',curFY:4.10,nxtFY:5.30},{date:'Apr 24',curFY:5.20,nxtFY:6.50},
    {date:'Jul 24',curFY:6.20,nxtFY:7.80},{date:'Oct 24',curFY:6.80,nxtFY:8.50},{date:'Jan 25',curFY:7.20,nxtFY:9.10},
    {date:'Apr 25',curFY:7.60,nxtFY:9.60},{date:'Jul 25',curFY:7.90,nxtFY:10.10},{date:'Oct 25',curFY:8.10,nxtFY:10.50},
    {date:'Jan 26',curFY:8.25,nxtFY:10.78},{date:'Mar 26',curFY:8.31,nxtFY:10.88},
  ],
  MSFT: [
    {date:'Jan 24',curFY:11.60,nxtFY:13.20},{date:'Mar 24',curFY:11.75,nxtFY:13.40},{date:'May 24',curFY:11.90,nxtFY:13.60},
    {date:'Jul 24',curFY:12.10,nxtFY:13.80},{date:'Sep 24',curFY:12.35,nxtFY:14.10},{date:'Nov 24',curFY:12.65,nxtFY:14.50},
    {date:'Jan 25',curFY:12.80,nxtFY:14.80},{date:'Mar 25',curFY:12.95,nxtFY:15.00},{date:'May 25',curFY:13.05,nxtFY:15.20},
    {date:'Jul 25',curFY:13.10,nxtFY:15.30},{date:'Sep 25',curFY:13.14,nxtFY:15.38},{date:'Nov 25',curFY:13.16,nxtFY:15.44},
    {date:'Jan 26',curFY:13.18,nxtFY:15.48},{date:'Mar 26',curFY:13.18,nxtFY:15.48},
  ],
  GOOGL: [
    {date:'Jan 24',curFY:7.20,nxtFY:8.50},{date:'Mar 24',curFY:7.35,nxtFY:8.65},{date:'May 24',curFY:7.50,nxtFY:8.80},
    {date:'Jul 24',curFY:7.68,nxtFY:9.00},{date:'Sep 24',curFY:7.82,nxtFY:9.20},{date:'Nov 24',curFY:7.95,nxtFY:9.45},
    {date:'Jan 25',curFY:8.10,nxtFY:9.70},{date:'Mar 25',curFY:8.25,nxtFY:9.90},{date:'May 25',curFY:8.38,nxtFY:10.05},
    {date:'Jul 25',curFY:8.50,nxtFY:10.15},{date:'Sep 25',curFY:8.65,nxtFY:10.22},{date:'Nov 25',curFY:8.78,nxtFY:10.30},
    {date:'Jan 26',curFY:8.88,nxtFY:10.38},{date:'Mar 26',curFY:8.95,nxtFY:10.42},
  ],
  TSLA: [
    {date:'Jan 24',curFY:3.80,nxtFY:5.20},{date:'Mar 24',curFY:3.40,nxtFY:4.90},{date:'May 24',curFY:2.90,nxtFY:4.60},
    {date:'Jul 24',curFY:2.60,nxtFY:4.30},{date:'Sep 24',curFY:2.50,nxtFY:4.20},{date:'Nov 24',curFY:2.55,nxtFY:4.10},
    {date:'Jan 25',curFY:2.70,nxtFY:4.30},{date:'Mar 25',curFY:2.80,nxtFY:4.40},{date:'May 25',curFY:2.90,nxtFY:4.45},
    {date:'Jul 25',curFY:2.85,nxtFY:4.42},{date:'Sep 25',curFY:2.82,nxtFY:4.40},{date:'Nov 25',curFY:2.83,nxtFY:4.44},
    {date:'Jan 26',curFY:2.84,nxtFY:4.45},{date:'Mar 26',curFY:2.84,nxtFY:4.45},
  ],
};

// Individual analyst estimates
const MOCK_ANALYSTS: Record<string, AnalystRow[]> = {
  AAPL: [
    {firm:'Morgan Stanley',     analyst:'Erik Woodring',     date:'03/10/26',curFY:7.55,curChange:0.05, nxtFY:8.45,nxtChange:0.10},
    {firm:'Goldman Sachs',      analyst:'Michael Ng',        date:'03/10/26',curFY:7.40,curChange:0.00, nxtFY:8.30,nxtChange:0.05},
    {firm:'Bank of America',    analyst:'Wamsi Mohan',       date:'03/09/26',curFY:7.35,curChange:0.08, nxtFY:8.22,nxtChange:0.12},
    {firm:'Wedbush',            analyst:'Daniel Ives',       date:'03/07/26',curFY:7.60,curChange:0.10, nxtFY:8.55,nxtChange:0.15},
    {firm:'Barclays',           analyst:'Tim Long',          date:'03/06/26',curFY:7.20,curChange:0.00, nxtFY:8.05,nxtChange:0.00},
    {firm:'Deutsche Bank',      analyst:'Sidney Ho',         date:'03/05/26',curFY:7.30,curChange:-0.05,nxtFY:8.10,nxtChange:-0.08},
    {firm:'Citi',               analyst:'Atif Malik',        date:'03/03/26',curFY:7.38,curChange:0.03, nxtFY:8.20,nxtChange:0.05},
    {firm:'UBS',                analyst:'David Vogt',        date:'02/28/26',curFY:7.25,curChange:0.00, nxtFY:8.12,nxtChange:0.00},
  ],
  NVDA: [
    {firm:'President Capital',  analyst:'Jin Chang',         date:'03/11/26',curFY:7.90,curChange:0.00, nxtFY:11.20,nxtChange:0.00},
    {firm:'Truist Securities',  analyst:'William Stein',     date:'03/10/26',curFY:7.62,curChange:0.00, nxtFY:10.12,nxtChange:0.00},
    {firm:'Haitong Intl',       analyst:'Barney Yao',        date:'03/10/26',curFY:8.76,curChange:0.00, nxtFY:12.28,nxtChange:0.00},
    {firm:'BofA Securities',    analyst:'Vivek Arya',        date:'03/09/26',curFY:8.11,curChange:0.00, nxtFY:10.72,nxtChange:0.00},
    {firm:'Huatai Research',    analyst:'Purdy Ho',          date:'03/06/26',curFY:9.40,curChange:0.00, nxtFY:11.90,nxtChange:0.00},
    {firm:'Deutsche Bank',      analyst:'Ross Seymore',      date:'03/03/26',curFY:8.50,curChange:0.02, nxtFY:11.20,nxtChange:-0.07},
    {firm:'CLSA',               analyst:'Bhavtosh Vajpayee', date:'03/03/26',curFY:8.30,curChange:0.98, nxtFY:10.60,nxtChange:1.27},
    {firm:'Craig-Hallum',       analyst:'Richard C Shannon', date:'03/02/26',curFY:9.90,curChange:2.38, nxtFY:13.85,nxtChange:3.70},
    {firm:'Morgan Stanley',     analyst:'Joseph L Moore',    date:'02/26/26',curFY:7.93,curChange:0.12, nxtFY:10.14,nxtChange:0.28},
    {firm:'Goldman Sachs',      analyst:'Toshiya Hari',      date:'02/25/26',curFY:8.20,curChange:0.30, nxtFY:10.80,nxtChange:0.50},
  ],
  MSFT: [
    {firm:'Morgan Stanley',     analyst:'Keith Weiss',       date:'03/10/26',curFY:13.30,curChange:0.10,nxtFY:15.65,nxtChange:0.12},
    {firm:'Goldman Sachs',      analyst:'Kash Rangan',       date:'03/09/26',curFY:13.20,curChange:0.05,nxtFY:15.55,nxtChange:0.08},
    {firm:'Wedbush',            analyst:'Daniel Ives',       date:'03/07/26',curFY:13.40,curChange:0.15,nxtFY:15.80,nxtChange:0.20},
    {firm:'Citi',               analyst:'Tyler Radke',       date:'03/05/26',curFY:13.10,curChange:0.00,nxtFY:15.40,nxtChange:0.00},
    {firm:'Deutsche Bank',      analyst:'Brad Zelnick',      date:'03/03/26',curFY:13.15,curChange:0.05,nxtFY:15.45,nxtChange:0.05},
    {firm:'Bank of America',    analyst:'Brad Sills',        date:'02/28/26',curFY:13.18,curChange:0.08,nxtFY:15.48,nxtChange:0.10},
    {firm:'Barclays',           analyst:'Raimo Lenschow',    date:'02/25/26',curFY:12.90,curChange:-0.05,nxtFY:15.20,nxtChange:-0.08},
  ],
  GOOGL: [
    {firm:'Morgan Stanley',     analyst:'Brian Nowak',       date:'03/10/26',curFY:9.10,curChange:0.12, nxtFY:10.60,nxtChange:0.15},
    {firm:'Goldman Sachs',      analyst:'Eric Sheridan',     date:'03/09/26',curFY:8.95,curChange:0.05, nxtFY:10.42,nxtChange:0.08},
    {firm:'Bank of America',    analyst:'Justin Post',       date:'03/07/26',curFY:9.00,curChange:0.10, nxtFY:10.50,nxtChange:0.12},
    {firm:'UBS',                analyst:'Lloyd Walmsley',    date:'03/05/26',curFY:8.80,curChange:0.00, nxtFY:10.25,nxtChange:0.00},
    {firm:'Barclays',           analyst:'Ross Sandler',      date:'03/03/26',curFY:8.85,curChange:0.05, nxtFY:10.30,nxtChange:0.05},
    {firm:'Deutsche Bank',      analyst:'Benjamin Black',    date:'02/28/26',curFY:8.90,curChange:0.08, nxtFY:10.38,nxtChange:0.10},
    {firm:'Citi',               analyst:'Ronald Josey',      date:'02/25/26',curFY:9.05,curChange:0.15, nxtFY:10.55,nxtChange:0.18},
  ],
  TSLA: [
    {firm:'Wedbush',            analyst:'Daniel Ives',       date:'03/10/26',curFY:3.20,curChange:-0.10,nxtFY:4.90,nxtChange:-0.20},
    {firm:'Morgan Stanley',     analyst:'Adam Jonas',        date:'03/09/26',curFY:2.90,curChange:-0.20,nxtFY:4.50,nxtChange:-0.30},
    {firm:'Goldman Sachs',      analyst:'Mark Delaney',      date:'03/07/26',curFY:2.65,curChange:-0.30,nxtFY:4.10,nxtChange:-0.40},
    {firm:'Barclays',           analyst:'Dan Levy',          date:'03/05/26',curFY:2.50,curChange:-0.35,nxtFY:3.80,nxtChange:-0.50},
    {firm:'Deutsche Bank',      analyst:'Emmanuel Rosner',   date:'03/03/26',curFY:2.80,curChange:-0.15,nxtFY:4.30,nxtChange:-0.25},
    {firm:'Bank of America',    analyst:'John Murphy',       date:'02/28/26',curFY:3.10,curChange:-0.08,nxtFY:4.70,nxtChange:-0.15},
    {firm:'Citi',               analyst:'Itay Michaeli',     date:'02/25/26',curFY:2.70,curChange:-0.22,nxtFY:4.20,nxtChange:-0.32},
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
  eps_median?: number; eps_stddev?: number; wk4_change?: number; wk4_up?: number; wk4_down?: number; est_pe?: number;
}
interface RevisionPoint { date: string; curFY: number | null; nxtFY: number | null; }
interface AnalystRow { firm: string; analyst: string; date: string; curFY: number; curChange: number; nxtFY: number; nxtChange: number; }

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

      // Normalize company facts fields; enrich with mock data for fields not in free API
      const cf = factsJson?.company_facts ?? factsJson;
      const mockFallback = MOCK_FACTS[T] || null;
      setFactsData({
        ...cf,
        market_cap:          cf.market_cap ?? cf.market_capitalization ?? mockFallback?.market_cap,
        employees:           cf.employees  ?? cf.number_of_employees   ?? mockFallback?.employees,
        ceo:                 cf.ceo         ?? mockFallback?.ceo,
        description:         cf.description ?? mockFallback?.description,
        founded:             cf.founded     ?? mockFallback?.founded,
        shares_outstanding:  cf.shares_outstanding ?? mockFallback?.shares_outstanding,
      });

      // Financials in parallel — work for 5 free tickers
      const [incRes, balRes, cashRes, metRes] = await Promise.all([
        fetch(`/api/analytics?endpoint=financials/income-statements&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financials/balance-sheets&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financials/cash-flow-statements&ticker=${T}&period=annual&limit=5`),
        fetch(`/api/analytics?endpoint=financial-metrics&ticker=${T}&period=annual&limit=8`),
      ]);

      const [incData, balData, cashData, metData] = await Promise.all([
        incRes.json(), balRes.json(), cashRes.json(), metRes.json(),
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

      // Analyst estimates — live API returns annual format without high/low/consensus
      // Always use mock data which has the quarterly consensus range format we need
      setEstimates(MOCK_ESTIMATES[T] || MOCK_ESTIMATES.AAPL);

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

  // ── Estimates — current FY (index 0) and next FY (index 1)
  const curEst = estimates[0];
  const nxtEst = estimates[1];

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
        {estimates.length > 0 && (() => {
          const revHistory = MOCK_REVISION_HISTORY[ticker] ?? MOCK_REVISION_HISTORY.AAPL;
          const analysts   = MOCK_ANALYSTS[ticker]          ?? MOCK_ANALYSTS.AAPL;
          const mono = "'IBM Plex Mono',monospace";
          const chgColor = (v: number) => v > 0 ? '#4ade80' : v < 0 ? '#f87171' : '#6b7280';
          const chgFmt   = (v: number) => v === 0 ? '0.00' : (v > 0 ? '+' : '') + v.toFixed(2);
          // stats table rows: [label, curVal, nxtVal]
          type StatRow = [string, string, string, boolean?];
          const rows: StatRow[] = curEst && nxtEst ? [
            ['Mean Consensus',   `$${fmt(curEst.eps_consensus)}`,   `$${fmt(nxtEst.eps_consensus)}`],
            ['Median Consensus', `$${fmt(curEst.eps_median)}`,      `$${fmt(nxtEst.eps_median)}`],
            ['High Consensus',   `$${fmt(curEst.eps_high)}`,        `$${fmt(nxtEst.eps_high)}`],
            ['Low Consensus',    `$${fmt(curEst.eps_low)}`,         `$${fmt(nxtEst.eps_low)}`],
            ['Std Deviation',    fmt(curEst.eps_stddev),             fmt(nxtEst.eps_stddev)],
            ['4-Week Change',    chgFmt(curEst.wk4_change ?? 0),    chgFmt(nxtEst.wk4_change ?? 0), true],
            ['4-Wk Up / Down',   `${curEst.wk4_up}/${curEst.wk4_down}`, `${nxtEst.wk4_up}/${nxtEst.wk4_down}`],
            ['# Estimates',      String(curEst.num_analysts),       String(nxtEst.num_analysts)],
            ['Est P/E',          curEst.est_pe ? `${fmt(curEst.est_pe,1)}x` : '—', nxtEst.est_pe ? `${fmt(nxtEst.est_pe,1)}x` : '—'],
          ] : [];
          return (
          <div style={{marginBottom:28}}>
            <SecLabel title="EPS CONSENSUS REVISIONS" sub="ANNUAL · CURRENT & NEXT FY · MOCK DATA"/>

            {/* ── Top: stats table + revision chart side by side ── */}
            <div style={{display:'grid',gridTemplateColumns:'300px 1fr',background:'#0d1117',border:'1px solid #1e2a3a',marginBottom:1}}>

              {/* Left: stats table */}
              <div style={{borderRight:'1px solid #1e2a3a'}}>
                {/* header */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px',borderBottom:'1px solid #1e2a3a',
                  padding:'8px 12px',gap:4,background:'#0a0e17'}}>
                  <div style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em',fontFamily:mono}}>METRIC · EPS ADJ</div>
                  <div style={{fontSize:10,fontWeight:700,color:'#f0c040',fontFamily:mono,textAlign:'right',letterSpacing:'.04em'}}>{curEst?.period}</div>
                  <div style={{fontSize:10,fontWeight:700,color:'#3b82f6',fontFamily:mono,textAlign:'right',letterSpacing:'.04em'}}>{nxtEst?.period}</div>
                </div>
                {rows.map(([label, cv, nv, isChg], i) => (
                  <div key={label} style={{display:'grid',gridTemplateColumns:'1fr 90px 90px',
                    padding:'6px 12px',gap:4,borderBottom:'1px solid #1e2a3a22',
                    background: i % 2 === 0 ? 'transparent' : '#0a0e1744'}}>
                    <div style={{fontSize:11,color:'#8b949e',fontFamily:mono}}>{label}</div>
                    <div style={{fontSize:11,fontFamily:mono,textAlign:'right',
                      color: isChg ? chgColor(curEst?.wk4_change ?? 0) : '#e2e8f0'}}>{cv}</div>
                    <div style={{fontSize:11,fontFamily:mono,textAlign:'right',
                      color: isChg ? chgColor(nxtEst?.wk4_change ?? 0) : '#e2e8f0'}}>{nv}</div>
                  </div>
                ))}
              </div>

              {/* Right: revision line chart */}
              <div style={{padding:'12px 16px 8px 8px'}}>
                {/* legend */}
                <div style={{display:'flex',gap:16,marginBottom:6,paddingLeft:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <div style={{width:24,height:2,background:'#f0c040'}}/>
                    <span style={{fontSize:9,color:'#f0c040',fontFamily:mono,letterSpacing:'.06em'}}>{curEst?.period} MEAN</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <div style={{width:24,height:2,background:'#3b82f6'}}/>
                    <span style={{fontSize:9,color:'#3b82f6',fontFamily:mono,letterSpacing:'.06em'}}>{nxtEst?.period} MEAN</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={195}>
                  <ComposedChart data={revHistory} margin={{top:4,right:40,bottom:0,left:0}}>
                    <CartesianGrid stroke="#1e2a3a" strokeDasharray="2 4" vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:'#4a5568',fontSize:9,fontFamily:mono}} axisLine={false} tickLine={false}
                      tickFormatter={(v:string)=> v.includes('Jan') || v.includes('Jul') ? v : ''} interval={0}/>
                    <YAxis tick={{fill:'#4a5568',fontSize:9,fontFamily:mono}} axisLine={false} tickLine={false}
                      tickFormatter={(v:number)=>`$${v.toFixed(2)}`} width={44} orientation="right"
                      domain={['auto','auto']}/>
                    <Tooltip
                      contentStyle={{background:'#0d1117',border:'1px solid #1e2a3a',borderRadius:2,padding:'6px 10px'}}
                      labelStyle={{color:'#8b949e',fontSize:9,fontFamily:mono,marginBottom:4}}
                      formatter={(v:unknown,name:unknown)=>[`$${Number(v).toFixed(2)}`, name==='curFY'?curEst?.period:nxtEst?.period]}
                      itemStyle={{fontSize:10,fontFamily:mono}}/>
                    <Line type="monotone" dataKey="curFY" stroke="#f0c040" strokeWidth={1.5} dot={false} connectNulls/>
                    <Line type="monotone" dataKey="nxtFY" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls/>
                    {/* current value labels on right */}
                    {curEst && <ReferenceLine y={curEst.eps_consensus} stroke="#f0c04044" strokeDasharray="3 4"/>}
                    {nxtEst && <ReferenceLine y={nxtEst.eps_consensus} stroke="#3b82f644" strokeDasharray="3 4"/>}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Bottom: analyst breakdown table ── */}
            <div style={{background:'#0d1117',border:'1px solid #1e2a3a',borderTop:'none',maxHeight:260,overflowY:'auto'}}>
              {/* header */}
              <div style={{display:'grid',gridTemplateColumns:'28px 1fr 140px 76px 80px 56px 80px 56px',
                borderBottom:'1px solid #1e2a3a',padding:'7px 12px',gap:4,background:'#0a0e17',position:'sticky',top:0,zIndex:1}}>
                {['#','FIRM','ANALYST','DATE',curEst?.period,'CHG',nxtEst?.period,'CHG'].map((h,i)=>(
                  <div key={i} style={{fontSize:9,color:'#4a5568',letterSpacing:'.1em',fontFamily:mono,
                    textAlign: i >= 4 ? 'right' : 'left'}}>{h}</div>
                ))}
              </div>
              {/* mean consensus row */}
              <div style={{display:'grid',gridTemplateColumns:'28px 1fr 140px 76px 80px 56px 80px 56px',
                padding:'7px 12px',gap:4,borderBottom:'1px solid #1e2a3a',background:'#0d1117'}}>
                <div style={{fontSize:10,color:'#4a5568',fontFamily:mono}}/>
                <div style={{fontSize:11,color:'#e2e8f0',fontFamily:mono,fontWeight:600}}>Mean Consensus</div>
                <div/>
                <div style={{fontSize:10,color:'#6b7280',fontFamily:mono}}>03/12/26</div>
                <div style={{textAlign:'right',fontSize:11,color:'#e2e8f0',fontFamily:mono,fontWeight:600}}>${fmt(curEst?.eps_consensus)}</div>
                <div/>
                <div style={{textAlign:'right',fontSize:11,color:'#e2e8f0',fontFamily:mono,fontWeight:600}}>${fmt(nxtEst?.eps_consensus)}</div>
                <div/>
              </div>
              {/* individual analysts */}
              {analysts.map((a,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'28px 1fr 140px 76px 80px 56px 80px 56px',
                  padding:'6px 12px',gap:4,borderBottom:'1px solid #1e2a3a18',
                  background: i%2===0?'transparent':'#0a0e1733'}}>
                  <div style={{fontSize:10,color:'#4a5568',fontFamily:mono}}>{i+1}</div>
                  <div style={{fontSize:11,color:'#f0c040',fontFamily:mono,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.firm}</div>
                  <div style={{fontSize:10,color:'#9ca3af',fontFamily:mono,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.analyst}</div>
                  <div style={{fontSize:10,color:'#f0c040',fontFamily:mono}}>{a.date}</div>
                  <div style={{textAlign:'right',fontSize:11,color:'#e2e8f0',fontFamily:mono}}>${a.curFY.toFixed(2)}</div>
                  <div style={{textAlign:'right',fontSize:10,color:chgColor(a.curChange),fontFamily:mono}}>{a.curChange===0?'—':chgFmt(a.curChange)}</div>
                  <div style={{textAlign:'right',fontSize:11,color:'#e2e8f0',fontFamily:mono}}>${a.nxtFY.toFixed(2)}</div>
                  <div style={{textAlign:'right',fontSize:10,color:chgColor(a.nxtChange),fontFamily:mono}}>{a.nxtChange===0?'—':chgFmt(a.nxtChange)}</div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

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
