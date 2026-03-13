'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
//  COVERAGE UNIVERSE
// ─────────────────────────────────────────────────────────────
const COMPANIES: { name: string; ticker: string; exchange: string; sector: string; country: string }[] = [
  { name:'Apple',                ticker:'AAPL',        exchange:'NASDAQ', sector:'Consumer Electronics',    country:'US' },
  { name:'Nvidia',               ticker:'NVDA',        exchange:'NASDAQ', sector:'Semiconductors / AI',     country:'US' },
  { name:'Microsoft',            ticker:'MSFT',        exchange:'NASDAQ', sector:'Software / Cloud',        country:'US' },
  { name:'Amazon',               ticker:'AMZN',        exchange:'NASDAQ', sector:'Cloud / AI',              country:'US' },
  { name:'Alphabet',             ticker:'GOOGL',       exchange:'NASDAQ', sector:'Cloud / AI',              country:'US' },
  { name:'Meta Platforms',       ticker:'META',        exchange:'NASDAQ', sector:'AI / Social',             country:'US' },
  { name:'Tesla',                ticker:'TSLA',        exchange:'NASDAQ', sector:'EV / Autonomy',           country:'US' },
  { name:'Broadcom',             ticker:'AVGO',        exchange:'NASDAQ', sector:'Semiconductors',          country:'US' },
  { name:'TSMC ADR',             ticker:'TSM',         exchange:'NYSE',   sector:'Semiconductor Foundry',   country:'US' },
  { name:'ASML ADR',             ticker:'ASML',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'AMD',                  ticker:'AMD',         exchange:'NASDAQ', sector:'Semiconductors',          country:'US' },
  { name:'Intel',                ticker:'INTC',        exchange:'NASDAQ', sector:'Semiconductors',          country:'US' },
  { name:'Qualcomm',             ticker:'QCOM',        exchange:'NASDAQ', sector:'Semiconductors / Mobile', country:'US' },
  { name:'Micron Technology',    ticker:'MU',          exchange:'NASDAQ', sector:'Memory',                  country:'US' },
  { name:'Texas Instruments',    ticker:'TXN',         exchange:'NASDAQ', sector:'Analog Semiconductors',   country:'US' },
  { name:'Applied Materials',    ticker:'AMAT',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'Lam Research',         ticker:'LRCX',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'KLA Corporation',      ticker:'KLAC',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'Analog Devices',       ticker:'ADI',         exchange:'NASDAQ', sector:'Analog Semiconductors',   country:'US' },
  { name:'Marvell Technology',   ticker:'MRVL',        exchange:'NASDAQ', sector:'Semiconductors',          country:'US' },
  { name:'NXP Semiconductors',   ticker:'NXPI',        exchange:'NASDAQ', sector:'Auto / Industrial Semis', country:'US' },
  { name:'Microchip Technology', ticker:'MCHP',        exchange:'NASDAQ', sector:'Microcontrollers',        country:'US' },
  { name:'ON Semiconductor',     ticker:'ON',          exchange:'NASDAQ', sector:'Power / Auto Semis',      country:'US' },
  { name:'Monolithic Power',     ticker:'MPWR',        exchange:'NASDAQ', sector:'Power Semiconductors',    country:'US' },
  { name:'Arm Holdings',         ticker:'ARM',         exchange:'NASDAQ', sector:'Semiconductor IP',        country:'US' },
  { name:'Synopsys',             ticker:'SNPS',        exchange:'NASDAQ', sector:'EDA',                     country:'US' },
  { name:'Cadence Design',       ticker:'CDNS',        exchange:'NASDAQ', sector:'EDA',                     country:'US' },
  { name:'Teradyne',             ticker:'TER',         exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'Entegris',             ticker:'ENTG',        exchange:'NASDAQ', sector:'Semiconductor Materials',  country:'US' },
  { name:'Western Digital',      ticker:'SNDK',        exchange:'NASDAQ', sector:'Memory / Storage',        country:'US' },
  { name:'Seagate Technology',   ticker:'STX',         exchange:'NASDAQ', sector:'Memory / Storage',        country:'US' },
  { name:'Vertiv Holdings',      ticker:'VRT',         exchange:'NYSE',   sector:'DC Power & Cooling',      country:'US' },
  { name:'Celestica',            ticker:'CLS',         exchange:'NYSE',   sector:'Networking / EMS',        country:'US' },
  { name:'Coherent',             ticker:'COHR',        exchange:'NYSE',   sector:'Optics',                  country:'US' },
  { name:'Fabrinet',             ticker:'FN',          exchange:'NYSE',   sector:'Optics / EMS',            country:'US' },
  { name:'Lumentum',             ticker:'LITE',        exchange:'NASDAQ', sector:'Optics',                  country:'US' },
  { name:'Baidu',                ticker:'BIDU',        exchange:'NASDAQ', sector:'China AI / Search',       country:'US' },
  { name:'NetEase',              ticker:'NTES',        exchange:'NASDAQ', sector:'China Gaming / Digital',  country:'US' },
  { name:'Tencent Music',        ticker:'TME',         exchange:'NYSE',   sector:'China Music Streaming',   country:'US' },
  { name:'Trip.com',             ticker:'TCOM',        exchange:'NASDAQ', sector:'China Travel',            country:'US' },
  { name:'PDD Holdings',         ticker:'PDD',         exchange:'NASDAQ', sector:'China E-commerce',        country:'US' },
  { name:'Electronic Arts',      ticker:'EA',          exchange:'NASDAQ', sector:'Gaming',                  country:'US' },
  { name:'Take-Two Interactive', ticker:'TTWO',        exchange:'NASDAQ', sector:'Gaming',                  country:'US' },
  { name:'Grab Holdings',        ticker:'GRAB',        exchange:'NASDAQ', sector:'ASEAN E-commerce',        country:'US' },
  { name:'Sea Limited',          ticker:'SE',          exchange:'NYSE',   sector:'ASEAN E-commerce',        country:'US' },
  { name:'Arista Networks',      ticker:'ANET',        exchange:'NYSE',   sector:'Networking',              country:'US' },
  { name:'Palo Alto Networks',   ticker:'PANW',        exchange:'NASDAQ', sector:'Cybersecurity',           country:'US' },
  { name:'CrowdStrike',          ticker:'CRWD',        exchange:'NASDAQ', sector:'Cybersecurity',           country:'US' },
  { name:'Fortinet',             ticker:'FTNT',        exchange:'NASDAQ', sector:'Cybersecurity',           country:'US' },
  { name:'ServiceNow',           ticker:'NOW',         exchange:'NYSE',   sector:'Enterprise SaaS',         country:'US' },
  { name:'Snowflake',            ticker:'SNOW',        exchange:'NYSE',   sector:'Data / Cloud',            country:'US' },
  { name:'Datadog',              ticker:'DDOG',        exchange:'NASDAQ', sector:'Observability',           country:'US' },
  { name:'MongoDB',              ticker:'MDB',         exchange:'NASDAQ', sector:'Database',                country:'US' },
  { name:'Palantir Technologies',ticker:'PLTR',        exchange:'NYSE',   sector:'AI / Analytics',          country:'US' },
  { name:'Confluent',            ticker:'CFLT',        exchange:'NASDAQ', sector:'Data Streaming',          country:'US' },
  { name:'Cloudflare',           ticker:'NET',         exchange:'NYSE',   sector:'Edge / CDN',              country:'US' },
  { name:'Zscaler',              ticker:'ZS',          exchange:'NASDAQ', sector:'Cybersecurity',           country:'US' },
  { name:'SentinelOne',          ticker:'S',           exchange:'NYSE',   sector:'Cybersecurity',           country:'US' },
  { name:'Okta',                 ticker:'OKTA',        exchange:'NASDAQ', sector:'Identity',                country:'US' },
  { name:'Twilio',               ticker:'TWLO',        exchange:'NYSE',   sector:'Communications',          country:'US' },
  { name:'Workday',              ticker:'WDAY',        exchange:'NASDAQ', sector:'Enterprise SaaS',         country:'US' },
  { name:'HubSpot',              ticker:'HUBS',        exchange:'NYSE',   sector:'CRM / Marketing',         country:'US' },
  { name:'Shopify',              ticker:'SHOP',        exchange:'NYSE',   sector:'E-commerce Platform',     country:'US' },
  { name:'Spotify Technology',   ticker:'SPOT',        exchange:'NYSE',   sector:'Music Streaming',         country:'US' },
  { name:'Uber Technologies',    ticker:'UBER',        exchange:'NYSE',   sector:'Mobility / Delivery',     country:'US' },
  { name:'Airbnb',               ticker:'ABNB',        exchange:'NASDAQ', sector:'Travel Platform',         country:'US' },
  { name:'Block Inc',            ticker:'XYZ',         exchange:'NYSE',   sector:'Fintech',                 country:'US' },
  { name:'Coinbase Global',      ticker:'COIN',        exchange:'NASDAQ', sector:'Crypto Exchange',         country:'US' },
  { name:'MicroStrategy',        ticker:'MSTR',        exchange:'NASDAQ', sector:'Bitcoin Treasury',        country:'US' },
  { name:'ACM Research',         ticker:'ACMR',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'Piotech (ADR)',        ticker:'PTCL',        exchange:'NASDAQ', sector:'Semiconductor Equipment', country:'US' },
  { name:'Hanwha Aerospace (ADR)',ticker:'HAERO',      exchange:'OTC',    sector:'Aerospace & Defence',     country:'US' },
  { name:'BHP Group ADR',        ticker:'BHP',         exchange:'NYSE',   sector:'Mining',                  country:'US' },
  { name:'Rio Tinto ADR',        ticker:'RIO',         exchange:'NYSE',   sector:'Mining',                  country:'US' },
  { name:'Tokyo Electron',       ticker:'8035.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Advantest',            ticker:'6857.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Disco Corp',           ticker:'6146.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Lasertec',             ticker:'6920.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Screen Holdings',      ticker:'7735.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Rorze',                ticker:'6323.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Kokusai Electric',     ticker:'6525.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'HOYA',                 ticker:'7741.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Tokyo Seimitsu',       ticker:'7729.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'TOWA',                 ticker:'6361.T',      exchange:'TSE',    sector:'Semi Equipment',          country:'JP' },
  { name:'Kioxia',               ticker:'285A.T',      exchange:'TSE',    sector:'Memory',                  country:'JP' },
  { name:'Sony Group',           ticker:'6758.T',      exchange:'TSE',    sector:'Consumer Electronics',    country:'JP' },
  { name:'Nintendo',             ticker:'7974.T',      exchange:'TSE',    sector:'Gaming',                  country:'JP' },
  { name:'Konami Group',         ticker:'9766.T',      exchange:'TSE',    sector:'Gaming',                  country:'JP' },
  { name:'Capcom',               ticker:'9697.T',      exchange:'TSE',    sector:'Gaming',                  country:'JP' },
  { name:'Bandai Namco',         ticker:'7832.T',      exchange:'TSE',    sector:'Gaming / Toys',           country:'JP' },
  { name:'Sega Sammy',           ticker:'6460.T',      exchange:'TSE',    sector:'Gaming',                  country:'JP' },
  { name:'Recruit Holdings',     ticker:'6098.T',      exchange:'TSE',    sector:'HR / SaaS',               country:'JP' },
  { name:'Keyence',              ticker:'6861.T',      exchange:'TSE',    sector:'Factory Automation',      country:'JP' },
  { name:'Fanuc',                ticker:'6954.T',      exchange:'TSE',    sector:'Factory Automation',      country:'JP' },
  { name:'Renesas Electronics',  ticker:'6723.T',      exchange:'TSE',    sector:'Automotive Semis',        country:'JP' },
  { name:'Murata Mfg',           ticker:'6981.T',      exchange:'TSE',    sector:'Electronic Components',   country:'JP' },
  { name:'TDK Corp',             ticker:'6762.T',      exchange:'TSE',    sector:'Electronic Components',   country:'JP' },
  { name:'Ibiden',               ticker:'4062.T',      exchange:'TSE',    sector:'PCB / Substrate',         country:'JP' },
  { name:'Shinko Electric',      ticker:'6967.T',      exchange:'TSE',    sector:'Semiconductor Packaging', country:'JP' },
  { name:'Sumitomo Bakelite',    ticker:'4203.T',      exchange:'TSE',    sector:'Semiconductor Materials',  country:'JP' },
  { name:'JSR Corp',             ticker:'4185.T',      exchange:'TSE',    sector:'Semiconductor Materials',  country:'JP' },
  { name:'Shin-Etsu Chemical',   ticker:'4063.T',      exchange:'TSE',    sector:'Semiconductor Materials',  country:'JP' },
  { name:'Sumco',                ticker:'3436.T',      exchange:'TSE',    sector:'Silicon Wafers',          country:'JP' },
  { name:'Hitachi',              ticker:'6501.T',      exchange:'TSE',    sector:'Industrial / IT',         country:'JP' },
  { name:'Fujitsu',              ticker:'6702.T',      exchange:'TSE',    sector:'IT Services',             country:'JP' },
  { name:'NEC',                  ticker:'6701.T',      exchange:'TSE',    sector:'IT Services',             country:'JP' },
  { name:'Softbank Group',       ticker:'9984.T',      exchange:'TSE',    sector:'Tech Investment',         country:'JP' },
  { name:'Softbank Corp',        ticker:'9434.T',      exchange:'TSE',    sector:'Telecom',                 country:'JP' },
  { name:'Rakuten Group',        ticker:'4755.T',      exchange:'TSE',    sector:'E-commerce / Fintech',    country:'JP' },
  { name:'Mercari',              ticker:'4385.T',      exchange:'TSE',    sector:'C2C Marketplace',         country:'JP' },
  { name:'MonotaRO',             ticker:'3064.T',      exchange:'TSE',    sector:'B2B E-commerce',          country:'JP' },
  { name:'SHIFT Inc',            ticker:'3697.T',      exchange:'TSE',    sector:'Software Testing',        country:'JP' },
  { name:'GMO Internet',         ticker:'9449.T',      exchange:'TSE',    sector:'Internet',                country:'JP' },
  { name:'Nippon Steel',         ticker:'5401.T',      exchange:'TSE',    sector:'Steel',                   country:'JP' },
  { name:'Mitsubishi Heavy Ind', ticker:'7011.T',      exchange:'TSE',    sector:'Defence / Industrial',    country:'JP' },
  { name:'IHI Corp',             ticker:'7013.T',      exchange:'TSE',    sector:'Defence / Aerospace',     country:'JP' },
  { name:'Kawasaki Heavy Ind',   ticker:'7012.T',      exchange:'TSE',    sector:'Defence / Industrial',    country:'JP' },
  { name:'Toyota Motor',         ticker:'7203.T',      exchange:'TSE',    sector:'EV / Automotive',         country:'JP' },
  { name:'TSMC',                 ticker:'2330.TW',     exchange:'TWSE',   sector:'Semiconductor Foundry',   country:'TW' },
  { name:'MediaTek',             ticker:'2454.TW',     exchange:'TWSE',   sector:'AI / Mobile Semis',       country:'TW' },
  { name:'Hon Hai (Foxconn)',    ticker:'2317.TW',     exchange:'TWSE',   sector:'Server ODM / EMS',        country:'TW' },
  { name:'Quanta Computer',      ticker:'2382.TW',     exchange:'TWSE',   sector:'Server ODM',              country:'TW' },
  { name:'Wistron',              ticker:'3231.TW',     exchange:'TWSE',   sector:'Server ODM',              country:'TW' },
  { name:'ASE Technology',       ticker:'3711.TW',     exchange:'TWSE',   sector:'Packaging / OSAT',        country:'TW' },
  { name:'Delta Electronics',    ticker:'2308.TW',     exchange:'TWSE',   sector:'DC Power',                country:'TW' },
  { name:'Lite-On Technology',   ticker:'2301.TW',     exchange:'TWSE',   sector:'DC Power / Components',   country:'TW' },
  { name:'Accton Technology',    ticker:'2345.TW',     exchange:'TWSE',   sector:'Networking',              country:'TW' },
  { name:'Unimicron Technology', ticker:'3037.TW',     exchange:'TWSE',   sector:'PCB',                     country:'TW' },
  { name:'Gold Circuit Electronics',ticker:'2368.TW',  exchange:'TWSE',   sector:'PCB',                     country:'TW' },
  { name:'Nanya Plastics',       ticker:'1303.TW',     exchange:'TWSE',   sector:'PCB / Chemicals',         country:'TW' },
  { name:'Yageo Corp',           ticker:'2327.TW',     exchange:'TWSE',   sector:'MLCCs / Passives',        country:'TW' },
  { name:'Nanya Technology',     ticker:'2408.TW',     exchange:'TWSE',   sector:'Memory',                  country:'TW' },
  { name:'Chroma ATE',           ticker:'2360.TW',     exchange:'TWSE',   sector:'Test Equipment',          country:'TW' },
  { name:'Wiwynn',               ticker:'6669.TW',     exchange:'TWSE',   sector:'Server ODM',              country:'TW' },
  { name:'Catcher Technology',   ticker:'2474.TW',     exchange:'TWSE',   sector:'Precision Components',    country:'TW' },
  { name:'Largan Precision',     ticker:'3008.TW',     exchange:'TWSE',   sector:'Optics',                  country:'TW' },
  { name:'Novatek Microelec',    ticker:'3034.TW',     exchange:'TWSE',   sector:'Display Driver IC',       country:'TW' },
  { name:'Realtek Semiconductor',ticker:'2379.TW',     exchange:'TWSE',   sector:'Semiconductors',          country:'TW' },
  { name:'eMemory Technology',   ticker:'3529.TW',     exchange:'TWSE',   sector:'Semiconductor IP',        country:'TW' },
  { name:'GUC (Global Unichip)', ticker:'3443.TW',     exchange:'TWSE',   sector:'ASIC Design',             country:'TW' },
  { name:'Sitronix Technology',  ticker:'8016.TW',     exchange:'TWSE',   sector:'Display Driver IC',       country:'TW' },
  { name:'Phison Electronics',   ticker:'8299.TW',     exchange:'TWSE',   sector:'Flash Storage',           country:'TW' },
  { name:'Silicon Motion',       ticker:'SIMO',        exchange:'NASDAQ', sector:'Flash Storage',           country:'TW' },
  { name:'Samsung Electronics',  ticker:'005930.KS',   exchange:'KRX',    sector:'Memory / Foundry',        country:'KR' },
  { name:'SK Hynix',             ticker:'000660.KS',   exchange:'KRX',    sector:'Memory',                  country:'KR' },
  { name:'Samsung SDI',          ticker:'006400.KS',   exchange:'KRX',    sector:'EV Batteries',            country:'KR' },
  { name:'LG Energy Solution',   ticker:'373220.KS',   exchange:'KRX',    sector:'EV Batteries',            country:'KR' },
  { name:'LG Chem',              ticker:'051910.KS',   exchange:'KRX',    sector:'Chemicals / Batteries',   country:'KR' },
  { name:'Hanwha Aerospace',     ticker:'012450.KS',   exchange:'KRX',    sector:'Aerospace & Defence',     country:'KR' },
  { name:'KAI',                  ticker:'047810.KS',   exchange:'KRX',    sector:'Aerospace & Defence',     country:'KR' },
  { name:'Hyundai Rotem',        ticker:'064350.KS',   exchange:'KRX',    sector:'Defence / Rail',          country:'KR' },
  { name:'LIG Nex1',             ticker:'079550.KS',   exchange:'KRX',    sector:'Defence',                 country:'KR' },
  { name:'Hanwha Systems',       ticker:'272210.KS',   exchange:'KRX',    sector:'Defence Electronics',     country:'KR' },
  { name:'Kakao Corp',           ticker:'035720.KS',   exchange:'KRX',    sector:'Internet / AI',           country:'KR' },
  { name:'Naver Corp',           ticker:'035420.KS',   exchange:'KRX',    sector:'Internet / AI',           country:'KR' },
  { name:'Krafton',              ticker:'259960.KS',   exchange:'KRX',    sector:'Gaming',                  country:'KR' },
  { name:'NCSOFT',               ticker:'036570.KS',   exchange:'KRX',    sector:'Gaming',                  country:'KR' },
  { name:'Pearl Abyss',          ticker:'263750.KS',   exchange:'KRX',    sector:'Gaming',                  country:'KR' },
  { name:'Alibaba',              ticker:'9988.HK',     exchange:'HKEX',   sector:'China Digital',           country:'HK' },
  { name:'Tencent',              ticker:'700.HK',      exchange:'HKEX',   sector:'China Digital',           country:'HK' },
  { name:'BYD',                  ticker:'1211.HK',     exchange:'HKEX',   sector:'EV / Batteries',          country:'HK' },
  { name:'Xiaomi',               ticker:'1810.HK',     exchange:'HKEX',   sector:'EV / Consumer Electronics',country:'HK'},
  { name:'MiniMax Group',        ticker:'0100.HK',     exchange:'HKEX',   sector:'China AI',                country:'HK' },
  { name:'Zhipu AI',             ticker:'2513.HK',     exchange:'HKEX',   sector:'China AI',                country:'HK' },
  { name:'Kuaishou Technology',  ticker:'1024.HK',     exchange:'HKEX',   sector:'China Short Video',       country:'HK' },
  { name:'Futu Holdings',        ticker:'FUTU',        exchange:'NASDAQ', sector:'HK Brokerage',            country:'HK' },
  { name:'Bilibili',             ticker:'BILI',        exchange:'NASDAQ', sector:'China Video',             country:'HK' },
  { name:'Meituan',              ticker:'3690.HK',     exchange:'HKEX',   sector:'China Delivery / Local',  country:'HK' },
  { name:'JD.com HK',            ticker:'9618.HK',     exchange:'HKEX',   sector:'China E-commerce',        country:'HK' },
  { name:'NetEase HK',           ticker:'9999.HK',     exchange:'HKEX',   sector:'China Gaming',            country:'HK' },
  { name:'CATL',                 ticker:'300750.SZ',   exchange:'SZSE',   sector:'EV Batteries',            country:'CN' },
  { name:'Suzhou TFC Optical',   ticker:'300394.SZ',   exchange:'SZSE',   sector:'Optical Components',      country:'CN' },
  { name:'Zhongji Innolight',    ticker:'300502.SZ',   exchange:'SZSE',   sector:'Optical Transceivers',    country:'CN' },
  { name:'NAURA Technology',     ticker:'002371.SZ',   exchange:'SZSE',   sector:'Semi Equipment',          country:'CN' },
  { name:'ACM Research Shanghai',ticker:'688082.SS',   exchange:'SSE',    sector:'Semi Equipment',          country:'CN' },
  { name:'SMIC A-share',         ticker:'688981.SS',   exchange:'SSE',    sector:'Foundry',                 country:'CN' },
  { name:'Piotech',              ticker:'688072.SS',   exchange:'SSE',    sector:'Semi Equipment',          country:'CN' },
  { name:'Beijing Huafeng',      ticker:'688508.SS',   exchange:'SSE',    sector:'Flash Memory IP',         country:'CN' },
  { name:'BYD A-share',          ticker:'002594.SZ',   exchange:'SZSE',   sector:'EV / Batteries',          country:'CN' },
  { name:'Hikvision',            ticker:'002415.SZ',   exchange:'SZSE',   sector:'AI / Surveillance',       country:'CN' },
  { name:'iFlytek',              ticker:'002230.SZ',   exchange:'SZSE',   sector:'AI / Voice',              country:'CN' },
  { name:'BHP Group',            ticker:'BHP.AX',      exchange:'ASX',    sector:'Mining',                  country:'AU' },
  { name:'Rio Tinto',            ticker:'RIO.AX',      exchange:'ASX',    sector:'Mining',                  country:'AU' },
  { name:'Fortescue',            ticker:'FMG.AX',      exchange:'ASX',    sector:'Iron Ore',                country:'AU' },
  { name:'Pilbara Minerals',     ticker:'PLS.AX',      exchange:'ASX',    sector:'Lithium',                 country:'AU' },
  { name:'Lynas Rare Earths',    ticker:'LYC.AX',      exchange:'ASX',    sector:'Rare Earths',             country:'AU' },
  { name:'Core Lithium',         ticker:'CXO.AX',      exchange:'ASX',    sector:'Lithium',                 country:'AU' },
  { name:'Allkem',               ticker:'AKE.AX',      exchange:'ASX',    sector:'Lithium',                 country:'AU' },
  { name:'Mineral Resources',    ticker:'MIN.AX',      exchange:'ASX',    sector:'Mining / Lithium',        country:'AU' },
  { name:'IGO Ltd',              ticker:'IGO.AX',      exchange:'ASX',    sector:'Nickel / Lithium',        country:'AU' },
  { name:'Nickel Industries',    ticker:'NIC.AX',      exchange:'ASX',    sector:'Nickel',                  country:'AU' },
  { name:'Chalice Mining',       ticker:'CHN.AX',      exchange:'ASX',    sector:'PGMs / Nickel',           country:'AU' },
  { name:'Iluka Resources',      ticker:'ILU.AX',      exchange:'ASX',    sector:'Mineral Sands',           country:'AU' },
  { name:'Sandfire Resources',   ticker:'SFR.AX',      exchange:'ASX',    sector:'Copper',                  country:'AU' },
  { name:'29Metals',             ticker:'29M.AX',      exchange:'ASX',    sector:'Copper / Zinc',           country:'AU' },
  { name:'Pantoro',              ticker:'PNR.AX',      exchange:'ASX',    sector:'Gold',                    country:'AU' },
  { name:'Northern Star',        ticker:'NST.AX',      exchange:'ASX',    sector:'Gold',                    country:'AU' },
  { name:'Tata Consultancy',     ticker:'TCS.NS',      exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'Infosys',              ticker:'INFY.NS',     exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'Wipro',                ticker:'WIPRO.NS',    exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'HCL Technologies',     ticker:'HCLTECH.NS',  exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'Tech Mahindra',        ticker:'TECHM.NS',    exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'Mphasis',              ticker:'MPHASIS.NS',  exchange:'NSE',    sector:'IT Services',             country:'IN' },
  { name:'Persistent Systems',   ticker:'PERSISTENT.NS',exchange:'NSE',   sector:'IT Services',            country:'IN' },
  { name:'Tata Elxsi',           ticker:'TATAELXSI.NS',exchange:'NSE',    sector:'IT Services / EV',       country:'IN' },
  { name:'Bharat Electronics',   ticker:'BEL.NS',      exchange:'NSE',    sector:'Defence Electronics',     country:'IN' },
];

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────
interface Quote {
  ticker: string; name: string; price: number | null; change: number | null;
  changePct: number | null; currency: string; marketCap: number | null;
  volume: number | null; high52w: number | null; low52w: number | null;
  prevClose: number | null; marketState: string;
}

interface Candle {
  time: string | number;
  open: number; high: number; low: number; close: number; volume: number;
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function fmtPrice(price: number | null, currency: string): string {
  if (price == null) return '—';
  const sym: Record<string, string> = { USD:'$', JPY:'¥', TWD:'NT$', KRW:'₩', HKD:'HK$', CNY:'¥', AUD:'A$', INR:'₹', EUR:'€', GBP:'£' };
  const s = sym[currency] ?? '';
  const dp = ['JPY','KRW','INR'].includes(currency) ? 0 : ['TWD','HKD','CNY'].includes(currency) ? 1 : 2;
  return `${s}${price.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

function fmtMC(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtVol(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
}

function chgColor(v: number | null) {
  if (v == null) return '#4a5568';
  return v >= 0 ? '#4ade80' : '#f87171';
}

function chgStr(pct: number | null) {
  if (pct == null) return '—';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

const BATCH_SIZE = 100;
const PERIODS = ['1W','1M','3M','6M','1Y','2Y','3Y','5Y'] as const;
type Period = typeof PERIODS[number];

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PricesPage() {
  const [quotes,          setQuotes]        = useState<Record<string, Quote>>({});
  const [quotesLoading,   setQuotesLoading] = useState(true);
  const [fetchedAt,       setFetchedAt]     = useState<number | null>(null);
  const [selectedTicker,  setSelected]      = useState('AAPL');
  const [period,          setPeriod]        = useState<Period>('1Y');
  const [candles,         setCandles]       = useState<Candle[]>([]);
  const [chartLoading,    setChartLoading]  = useState(false);
  const [chartError,      setChartError]    = useState('');
  const [watchSearch,     setWatchSearch]   = useState('');

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<unknown>(null);
  const candleSeriesRef   = useRef<unknown>(null);
  const volSeriesRef      = useRef<unknown>(null);
  const chartReadyRef     = useRef(false);

  // ── Fetch all watchlist prices (batched) ──
  const fetchAllPrices = useCallback(async () => {
    setQuotesLoading(true);
    try {
      const allTickers = COMPANIES.map(c => c.ticker);
      const batches: string[][] = [];
      for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
        batches.push(allTickers.slice(i, i + BATCH_SIZE));
      }
      const results = await Promise.all(
        batches.map(b => fetch(`/api/price?tickers=${encodeURIComponent(b.join(','))}`).then(r => r.json()))
      );
      const map: Record<string, Quote> = {};
      for (const res of results) {
        for (const q of (res.quotes ?? [])) map[q.ticker] = q;
      }
      setQuotes(map);
      setFetchedAt(Date.now());
    } catch { /* silent */ }
    finally { setQuotesLoading(false); }
  }, []);

  // ── Fetch chart OHLCV ──
  const fetchChart = useCallback(async (ticker: string, p: Period) => {
    setChartLoading(true);
    setChartError('');
    try {
      const res = await fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&period=${p}`);
      const data = await res.json();
      if (data.error && !data.candles?.length) { setChartError(data.error); setCandles([]); }
      else setCandles(data.candles ?? []);
    } catch (e) {
      setChartError(String(e));
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ── Init lightweight-charts (once) ──
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let chart: { remove: () => void; applyOptions: (o: unknown) => void; timeScale: () => { fitContent: () => void }; priceScale: (id: string) => { applyOptions: (o: unknown) => void } } | null = null;
    let ro: ResizeObserver | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('lightweight-charts').then((lc: any) => {
      const el = chartContainerRef.current;
      if (!el) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartInstance: any = lc.createChart(el, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#0a0e17' },
          textColor: '#6b7280',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#1e2a3a' },
          horzLines: { color: '#1e2a3a' },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: '#1e2a3a',
          textColor: '#6b7280',
        },
        timeScale: {
          borderColor: '#1e2a3a',
          timeVisible: true,
          secondsVisible: false,
          barSpacing: 8,
        },
        width:  el.clientWidth,
        height: el.clientHeight,
      });

      // Candlestick series (v5 API)
      const cSeries = chartInstance.addSeries(lc.CandlestickSeries, {
        upColor:        '#4ade80',
        downColor:      '#f87171',
        borderUpColor:  '#4ade80',
        borderDownColor:'#f87171',
        wickUpColor:    '#4ade80',
        wickDownColor:  '#f87171',
      });

      // Volume histogram (overlay, bottom 20%)
      const vSeries = chartInstance.addSeries(lc.HistogramSeries, {
        priceFormat:  { type: 'volume' },
        priceScaleId: 'vol',
        color:        '#f0c04022',
      });
      chartInstance.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });

      chart                   = chartInstance;
      chartRef.current        = chartInstance;
      candleSeriesRef.current = cSeries;
      volSeriesRef.current    = vSeries;
      chartReadyRef.current   = true;

      // Resize observer
      ro = new ResizeObserver(() => {
        if (el && chartInstance) {
          chartInstance.applyOptions({ width: el.clientWidth, height: el.clientHeight });
        }
      });
      ro.observe(el);
    });

    return () => {
      ro?.disconnect();
      chart?.remove();
      chartReadyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push candle data to chart when it changes ──
  useEffect(() => {
    if (!chartReadyRef.current) {
      // Chart not ready yet — retry after a tick
      const t = setTimeout(() => {
        if (!chartReadyRef.current || !candles.length) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (candleSeriesRef.current as any)?.setData(candles.map(c => ({
          time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
        })));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (volSeriesRef.current as any)?.setData(candles.map(c => ({
          time:  c.time,
          value: c.volume,
          color: c.close >= c.open ? '#4ade8033' : '#f8717133',
        })));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (chartRef.current as any)?.timeScale().fitContent();
      }, 600);
      return () => clearTimeout(t);
    }
    if (!candles.length) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (candleSeriesRef.current as any)?.setData(candles.map(c => ({
      time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (volSeriesRef.current as any)?.setData(candles.map(c => ({
      time:  c.time,
      value: c.volume,
      color: c.close >= c.open ? '#4ade8033' : '#f8717133',
    })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chartRef.current as any)?.timeScale().fitContent();
  }, [candles]);

  // ── Fetch chart on selection / period change ──
  useEffect(() => {
    fetchChart(selectedTicker, period);
  }, [selectedTicker, period, fetchChart]);

  // ── Initial watchlist load + 60s refresh ──
  useEffect(() => {
    fetchAllPrices();
    const t = setInterval(fetchAllPrices, 60_000);
    return () => clearInterval(t);
  }, [fetchAllPrices]);

  // ── Derived ──
  const selectedCompany = COMPANIES.find(c => c.ticker === selectedTicker)!;
  const selectedQuote   = quotes[selectedTicker];

  // Watchlist: sort by market cap desc, filter by search
  const watchlist = COMPANIES
    .filter(c => {
      if (!watchSearch) return true;
      const q = watchSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const mc_a = quotes[a.ticker]?.marketCap ?? -1;
      const mc_b = quotes[b.ticker]?.marketCap ?? -1;
      return mc_b - mc_a;
    });

  const timeStr = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 56px)',
      background: '#0a0e17', color: '#c9d1d9',
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0a0e17}
        ::-webkit-scrollbar-thumb{background:#f0c04033;border-radius:2px}
        .wl-row:hover{background:#ffffff07!important;cursor:pointer}
        .period-btn{background:none;border:1px solid #1e2a3a;color:#6b7280;padding:3px 10px;font-size:9px;letter-spacing:.1em;cursor:pointer;font-family:'IBM Plex Mono',monospace;transition:all .15s}
        .period-btn:hover{border-color:#f0c04066;color:#f0c040}
        .period-btn.active{background:#f0c04015;border-color:#f0c040;color:#f0c040}
        .p-input{background:#0d1117;border:1px solid #1e2a3a;color:#e2e8f0;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;outline:none;width:100%;transition:border-color .2s}
        .p-input:focus{border-color:#f0c04066}
        .p-input::placeholder{color:#374151}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        flexShrink: 0, background: '#0d1117',
        borderBottom: '1px solid #1e2a3a',
        padding: '0 16px', height: 44,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Live indicator */}
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: quotesLoading ? '#374151' : '#4ade80',
          }}/>
          <span style={{ color:'#f0c040', fontWeight:700, fontSize:10, letterSpacing:'.14em' }}>LIVE PRICES</span>
        </div>

        {/* Separator */}
        <div style={{ width:1, height:20, background:'#1e2a3a' }}/>

        {/* Selected stock quick info */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:'#f0c040', fontWeight:700, fontSize:13, letterSpacing:'.04em' }}>
            {selectedCompany?.ticker}
          </span>
          <span style={{ color:'#8b949e', fontSize:11 }}>
            {selectedCompany?.name}
          </span>
          {selectedQuote?.price != null && (
            <>
              <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:13 }}>
                {fmtPrice(selectedQuote.price, selectedQuote.currency)}
              </span>
              <span style={{ color: chgColor(selectedQuote.changePct), fontWeight:600, fontSize:11 }}>
                {chgStr(selectedQuote.changePct)}
              </span>
            </>
          )}
        </div>

        {/* Period selector */}
        <div style={{ display:'flex', gap:3, marginLeft:'auto' }}>
          {PERIODS.map(p => (
            <button key={p} className={`period-btn${period === p ? ' active' : ''}`}
              onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>

        {/* Refresh / timestamp */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:8 }}>
          <span style={{ fontSize:9, color:'#374151', letterSpacing:'.06em' }}>
            {quotesLoading ? 'LOADING…' : `UPD ${timeStr}`}
          </span>
          <button onClick={fetchAllPrices} style={{
            background:'none', border:'1px solid #1e2a3a', color:'#6b7280',
            padding:'3px 10px', fontSize:9, letterSpacing:'.08em', cursor:'pointer',
            fontFamily:"'IBM Plex Mono',monospace",
          }}>
            ↻
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* ── LEFT: CHART PANEL ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

          {/* Stock header */}
          <div style={{
            flexShrink:0, padding:'10px 16px',
            borderBottom:'1px solid #1e2a3a',
            background:'#0d1117',
            display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
          }}>
            <div>
              <div style={{ color:'#f0c040', fontWeight:700, fontSize:18, letterSpacing:'.04em', lineHeight:1 }}>
                {selectedCompany?.ticker}
              </div>
              <div style={{ color:'#6b7280', fontSize:10, marginTop:3, letterSpacing:'.04em' }}>
                {selectedCompany?.exchange} · {selectedCompany?.sector}
              </div>
            </div>

            {selectedQuote ? (
              <>
                <div>
                  <div style={{ color:'#e2e8f0', fontWeight:700, fontSize:20, lineHeight:1 }}>
                    {fmtPrice(selectedQuote.price, selectedQuote.currency)}
                  </div>
                  <div style={{ color: chgColor(selectedQuote.change), fontSize:11, marginTop:3 }}>
                    {selectedQuote.change != null ? `${selectedQuote.change >= 0 ? '+' : ''}${fmtPrice(selectedQuote.change, selectedQuote.currency)}` : ''}
                    {' '}
                    <span style={{ fontWeight:700 }}>{chgStr(selectedQuote.changePct)}</span>
                  </div>
                </div>

                <div style={{ display:'flex', gap:20, marginLeft:'auto', flexWrap:'wrap' }}>
                  {[
                    ['MKT CAP',  fmtMC(selectedQuote.marketCap)],
                    ['VOLUME',   fmtVol(selectedQuote.volume)],
                    ['52W HIGH', selectedQuote.high52w != null ? fmtPrice(selectedQuote.high52w, selectedQuote.currency) : '—'],
                    ['52W LOW',  selectedQuote.low52w  != null ? fmtPrice(selectedQuote.low52w,  selectedQuote.currency) : '—'],
                    ['PREV CLOSE', fmtPrice(selectedQuote.prevClose, selectedQuote.currency)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ textAlign:'right' }}>
                      <div style={{ color:'#374151', fontSize:8, letterSpacing:'.1em' }}>{label}</div>
                      <div style={{ color:'#9ca3af', fontSize:11, fontWeight:500, marginTop:2 }}>{val}</div>
                    </div>
                  ))}
                  {/* Market state */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:8, letterSpacing:'.1em', color:'#374151' }}>STATUS</div>
                    <div style={{
                      marginTop:2, fontSize:9, fontWeight:700, letterSpacing:'.08em',
                      color: selectedQuote.marketState === 'REGULAR' ? '#4ade80'
                           : selectedQuote.marketState === 'CLOSED'  ? '#374151' : '#f0c040',
                    }}>
                      {selectedQuote.marketState === 'REGULAR' ? '● OPEN'
                       : selectedQuote.marketState === 'CLOSED' ? '○ CLOSED'
                       : selectedQuote.marketState === 'PRE'    ? '● PRE'
                       : `● ${selectedQuote.marketState}`}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color:'#374151', fontSize:10 }}>
                {quotesLoading ? 'Loading quote…' : 'No quote data'}
              </div>
            )}
          </div>

          {/* Chart area */}
          <div style={{ flex:1, position:'relative', minHeight:0 }}>
            {/* Loading overlay */}
            {chartLoading && (
              <div style={{
                position:'absolute', inset:0, zIndex:10,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'#0a0e17cc',
              }}>
                <span style={{ color:'#f0c040', fontSize:10, letterSpacing:'.1em' }}>LOADING CHART…</span>
              </div>
            )}
            {/* Error overlay */}
            {chartError && !chartLoading && (
              <div style={{
                position:'absolute', inset:0, zIndex:10,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'#0a0e17',
              }}>
                <span style={{ color:'#f87171', fontSize:10 }}>{chartError}</span>
              </div>
            )}
            <div ref={chartContainerRef} style={{ width:'100%', height:'100%' }} />
          </div>

          {/* Chart footer */}
          <div style={{
            flexShrink:0, padding:'4px 14px',
            borderTop:'1px solid #1e2a3a',
            fontSize:8, color:'#374151', letterSpacing:'.06em',
            display:'flex', justifyContent:'space-between',
            background:'#0d1117',
          }}>
            <span>Yahoo Finance · OHLCV daily · Prices may be delayed 15–20 min</span>
            <span>Auto-refresh every 60s</span>
          </div>
        </div>

        {/* ── RIGHT: WATCHLIST ── */}
        <div style={{
          flexShrink:0, width:272,
          borderLeft:'1px solid #1e2a3a',
          display:'flex', flexDirection:'column',
          overflow:'hidden', background:'#0d1117',
        }}>
          {/* Search */}
          <div style={{ flexShrink:0, padding:'8px 10px', borderBottom:'1px solid #1e2a3a' }}>
            <input
              className="p-input"
              placeholder="SEARCH WATCHLIST…"
              value={watchSearch}
              onChange={e => setWatchSearch(e.target.value)}
            />
          </div>

          {/* Count */}
          <div style={{
            flexShrink:0, padding:'4px 10px',
            fontSize:8, color:'#374151', letterSpacing:'.08em',
            borderBottom:'1px solid #1e2a3a',
          }}>
            {watchlist.length} OF {COMPANIES.length} SECURITIES
          </div>

          {/* Rows */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {watchlist.map(company => {
              const q = quotes[company.ticker];
              const isSelected = company.ticker === selectedTicker;
              const pct = q?.changePct ?? null;
              return (
                <div
                  key={company.ticker}
                  className="wl-row"
                  onClick={() => setSelected(company.ticker)}
                  style={{
                    padding: '10px 10px',
                    borderBottom: '1px solid #1e2a3a22',
                    borderLeft: `2px solid ${isSelected ? '#f0c040' : 'transparent'}`,
                    background: isSelected ? '#f0c04008' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Left: ticker + name */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      color: isSelected ? '#f0c040' : '#d1a520',
                      fontWeight: 700, fontSize: 15, letterSpacing: '.04em',
                      lineHeight: 1.2,
                    }}>
                      {company.ticker}
                    </div>
                    <div style={{
                      color: '#6b7280', fontSize: 13, marginTop: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {company.name}
                    </div>
                  </div>

                  {/* Right: price + change% */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ color:'#9ca3af', fontSize:15, fontWeight:500, lineHeight:1.2 }}>
                      {q ? fmtPrice(q.price, q.currency) : quotesLoading ? <span style={{color:'#2d3748'}}>…</span> : '—'}
                    </div>
                    <div style={{
                      color: chgColor(pct),
                      fontSize: 13, fontWeight: 700, marginTop: 3,
                    }}>
                      {chgStr(pct)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
