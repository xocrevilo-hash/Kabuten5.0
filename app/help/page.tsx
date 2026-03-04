import NavBar from '@/components/NavBar';

const FUNCTIONS = [
  {
    name: 'Catalyst Calendar',
    category: 'CORE',
    what: 'Lists upcoming earnings dates, product launches, and regulatory events for covered companies in the next 30 days.',
    data: 'Coverage universe, prior brief, web search',
  },
  {
    name: 'Comps Table',
    category: 'CORE',
    what: 'Builds a peer comparison table showing valuation multiples, revenue growth, and margin profiles across covered names.',
    data: 'Bloomberg data, web search',
  },
  {
    name: 'Earnings Analysis',
    category: 'BLOOMBERG',
    what: 'Analyses a recent earnings report — revenue/EPS vs consensus, guidance changes, key metric surprises, and management tone.',
    data: 'Bloomberg consensus, earnings transcript, web search',
  },
  {
    name: 'Earnings Momentum',
    category: 'BLOOMBERG',
    what: 'Tracks EPS revision trends across the coverage universe — identifies names with accelerating upgrades or deteriorating estimate cuts.',
    data: 'Bloomberg consensus estimates, recent analyst notes',
  },
  {
    name: 'Free-Form Analysis',
    category: 'CORE',
    what: "Responds to any ad hoc analytical question with structured research drawing on the agent's brief and real-time web data.",
    data: 'Agent brief, web search',
  },
  {
    name: 'Idea Generation',
    category: 'RESEARCH',
    what: 'Screens the coverage universe for inflecting fundamentals, valuation dislocations, or consensus mismatch worth investigating.',
    data: 'Bloomberg data, agent brief, web search',
  },
  {
    name: 'Initiating Coverage',
    category: 'RESEARCH',
    what: 'Writes a full initiation note with investment thesis, bull/base/bear cases, target price rationale, and key risks.',
    data: 'Web search, Bloomberg data',
  },
  {
    name: 'Morning Note',
    category: 'AUTO',
    what: 'Overnight briefing covering price moves, news flow, and pre-market developments for all covered companies.',
    data: 'Web search (overnight news)',
  },
  {
    name: 'Scenario Analysis',
    category: 'CORE',
    what: 'Models bull, base, and bear scenarios around a specific catalyst or macro event, with probability weighting.',
    data: 'Agent brief, Bloomberg data, web search',
  },
  {
    name: 'Sector Sweep',
    category: 'AUTO',
    what: 'Daily sweep of all covered companies — classifies each as Material / Incremental / No Change and proposes brief updates where warranted.',
    data: 'Web search, Bloomberg data, prior brief',
  },
  {
    name: 'Valuation Snapshot',
    category: 'BLOOMBERG',
    what: 'Compares current valuation multiples to 12-month history — flags names trading at a significant premium or discount to their own range.',
    data: 'Bloomberg data',
  },
];

const CATEGORY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  AUTO:      { bg: '#f3f4f6', color: '#6b7280', label: 'AUTO' },
  CORE:      { bg: '#eff6ff', color: '#2563eb', label: 'CORE' },
  BLOOMBERG: { bg: '#f0fdf4', color: '#16a34a', label: 'BLOOMBERG' },
  RESEARCH:  { bg: '#faf5ff', color: '#7c3aed', label: 'RESEARCH' },
};

export default function HelpPage() {
  return (
    <div className="kanji-wallpaper" style={{ minHeight: '100vh' }}>
      <NavBar />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '0.06em',
            color: '#0f0f0e',
            marginBottom: '0.5rem',
          }}>
            ANALYST FUNCTIONS
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.875rem',
            color: '#6b6b67',
            lineHeight: 1.6,
          }}>
            Each sector agent supports the following analytical functions. Type a function name in any agent thread to invoke it, or ask the agent directly.
          </p>
        </div>

        {/* Category legend */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <span
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backgroundColor: style.bg,
                color: style.color,
              }}
            >
              {style.label}
            </span>
          ))}
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.75rem',
            color: '#9b9b97',
            alignSelf: 'center',
          }}>
            AUTO = runs on schedule · BLOOMBERG = requires Bloomberg feed · CORE = always available · RESEARCH = deep-dive
          </span>
        </div>

        {/* Table */}
        <div className="content-box" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Function</th>
                <th>What It Does</th>
                <th style={{ width: '220px' }}>Data It Uses</th>
              </tr>
            </thead>
            <tbody>
              {FUNCTIONS.map((fn) => {
                const catStyle = CATEGORY_STYLES[fn.category] || CATEGORY_STYLES.CORE;
                return (
                  <tr key={fn.name}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#0f0f0e',
                        }}>
                          {fn.name}
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '1px 7px',
                          borderRadius: '9999px',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          backgroundColor: catStyle.bg,
                          color: catStyle.color,
                          width: 'fit-content',
                        }}>
                          {fn.category}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.8125rem',
                        color: '#1f1f1c',
                        lineHeight: 1.5,
                      }}>
                        {fn.what}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.75rem',
                        color: '#6b6b67',
                        lineHeight: 1.5,
                      }}>
                        {fn.data}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.75rem',
          color: '#9b9b97',
          marginTop: '1.25rem',
          lineHeight: 1.6,
        }}>
          SHRINK (Investment Philosophy) supports free-form conversation only — no coverage, no sweep. All other agents support the full function set above subject to Bloomberg data availability.
        </p>
      </div>
    </div>
  );
}
