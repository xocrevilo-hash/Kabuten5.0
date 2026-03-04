export interface AgentConfig {
  agent_key: string;
  agent_name: string;
  sector_name: string;
  colour: string;
  tickers: string[];
  companies: string[];
}

export const AGENTS: AgentConfig[] = [
  {
    agent_key: 'apex',
    agent_name: 'APEX',
    sector_name: 'AU Enterprise Software',
    colour: 'green',
    tickers: ['WTC', 'XRO', 'PME', 'REA', 'SEK'],
    companies: ['WiseTech Global', 'Xero', 'Pro Medicus', 'REA Group', 'Seek'],
  },
  {
    agent_key: 'orient',
    agent_name: 'ORIENT',
    sector_name: 'China Digital Consumption',
    colour: 'blue',
    tickers: ['BABA', 'BIDU', 'NTES', '700.HK', 'TME', 'TCOM', 'PDD'],
    companies: ['Alibaba', 'Baidu', 'NetEase', 'Tencent', 'Tencent Music', 'Trip.com', 'PDD Holdings'],
  },
  {
    agent_key: 'volt',
    agent_name: 'VOLT',
    sector_name: 'DC Power & Cooling',
    colour: 'gold',
    tickers: ['VRT', '3324.TW', '2308.TW', '6501.T', '2301.TW'],
    companies: ['Vertiv', 'Delta Electronics (3324)', 'Delta Electronics (2308)', 'Hitachi', 'Lite-On Technology'],
  },
  {
    agent_key: 'indra',
    agent_name: 'INDRA',
    sector_name: 'India IT Services',
    colour: 'purple',
    tickers: ['INFY.NS', 'TCS.NS', 'TECHM.NS', 'WIPRO.NS'],
    companies: ['Infosys', 'TCS', 'Tech Mahindra', 'Wipro'],
  },
  {
    agent_key: 'helix',
    agent_name: 'HELIX',
    sector_name: 'Memory Semis',
    colour: 'amber',
    tickers: ['285A.T', 'MU', '005930.KS', 'SNDK', 'STX', '000660.KS', '2408.TW'],
    companies: ['Kioxia', 'Micron', 'Samsung Electronics', 'Western Digital', 'Seagate', 'SK Hynix', 'Nanya Technology'],
  },
  {
    agent_key: 'photon',
    agent_name: 'PHOTON',
    sector_name: 'Networking & Optics',
    colour: 'red',
    tickers: ['2345.TW', 'CLS', 'COHR', 'FN', 'LITE', '300394.SZ', '300308.SZ', '300502.SZ'],
    companies: ['Accton Technology', 'Celestica', 'Coherent', 'Fabrinet', 'Lumentum', 'Zhongji Innolight', 'Eoptolink (300308)', 'Eoptolink (300502)'],
  },
  {
    agent_key: 'forge',
    agent_name: 'FORGE',
    sector_name: 'Semi Equipment',
    colour: 'teal',
    tickers: ['688082.SS', '6857.T', 'AMAT', '3711.TW', 'ASML', '6146.T', '6361.T', '7741.T', 'KLAC', '6525.T', 'LRCX', '6920.T', '6323.T', '7735.T', '8035.T', '7729.T', '002371.SZ'],
    companies: ['NAURA Tech (A)', 'Advantest', 'Applied Materials', 'ASE Technology', 'ASML', 'Disco', 'TOWA', 'HOYA', 'KLA', 'Kokusai Electric', 'Lam Research', 'Lasertec', 'Rorze', 'Screen Holdings', 'Tokyo Electron', 'Tokyo Seimitsu', 'NAURA Technology'],
  },
  {
    agent_key: 'surge',
    agent_name: 'SURGE',
    sector_name: 'EV Supply-chain',
    colour: 'pink',
    tickers: ['TSLA', '1211.HK', '300750.SZ', '1810.HK', '373220.KS'],
    companies: ['Tesla', 'BYD', 'CATL', 'Xiaomi', 'LG Energy Solution'],
  },
  {
    agent_key: 'synth',
    agent_name: 'SYNTH',
    sector_name: 'China AI Apps',
    colour: 'lime',
    tickers: ['0100.HK', '2513.HK'],
    companies: ['MiniMax Group', 'Zhipu AI'],
  },
  {
    agent_key: 'dragon',
    agent_name: 'DRAGON',
    sector_name: 'China Semis',
    colour: 'sky',
    tickers: ['688981.SS', '688256.SS', '688041.SS', '603501.SS', '688008.SS'],
    companies: ['SMIC (A-shares)', 'Cambricon', 'Hygon', 'Will Semiconductor', 'Montage Technology'],
  },
  {
    agent_key: 'terra',
    agent_name: 'TERRA',
    sector_name: 'Japan Materials',
    colour: 'green',
    tickers: ['4004.T', '3110.T', '3436.T', '5016.T', '4062.T'],
    companies: ['Resonac Holdings', 'Nitto Boseki', 'SUMCO Corp', 'JX Advanced Metals', 'Ibiden'],
  },
  {
    agent_key: 'pixel',
    agent_name: 'PIXEL',
    sector_name: 'Gaming',
    colour: 'blue',
    tickers: ['7974.T', '6758.T', '9697.T', 'EA', 'TTWO'],
    companies: ['Nintendo', 'Sony Group', 'Capcom', 'Electronic Arts', 'Take-Two Interactive'],
  },
  {
    agent_key: 'layer',
    agent_name: 'LAYER',
    sector_name: 'PCB Supply-chain',
    colour: 'gold',
    tickers: ['007660.KS', '2368.TW', '3037.TW', '1303.TW'],
    companies: ['Isu Petasys', 'Gold Circuit Electronics', 'Unimicron Technology', 'Nanya Plastics'],
  },
  {
    agent_key: 'tide',
    agent_name: 'TIDE',
    sector_name: 'ASEAN E-commerce',
    colour: 'purple',
    tickers: ['GRAB', 'SE'],
    companies: ['Grab Holdings', 'Sea Limited'],
  },
  {
    agent_key: 'nova',
    agent_name: 'NOVA',
    sector_name: 'AI Semis',
    colour: 'amber',
    tickers: ['2330.TW', 'NVDA', 'AVGO', 'AMD', '2454.TW', 'MRVL'],
    companies: ['TSMC', 'Nvidia', 'Broadcom', 'AMD', 'MediaTek', 'Marvell Technology'],
  },
  {
    agent_key: 'ferro',
    agent_name: 'FERRO',
    sector_name: 'MLCCs',
    colour: 'red',
    tickers: ['6981.T', '6762.T', '2327.TW', '009150.KS'],
    companies: ['Murata Manufacturing', 'TDK Corp', 'Yageo Corp', 'Samsung Electro-Mechanics'],
  },
  {
    agent_key: 'rack',
    agent_name: 'RACK',
    sector_name: 'Server ODMs',
    colour: 'teal',
    tickers: ['2317.TW', '2382.TW', '3231.TW'],
    companies: ['Hon Hai / Foxconn', 'Quanta Computer', 'Wistron'],
  },
];

export const getAgent = (key: string) => AGENTS.find(a => a.agent_key === key.toLowerCase());
