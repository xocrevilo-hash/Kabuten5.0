'use client';

interface AgentDetail {
  agent_key: string;
  agent_name: string;
  sector_name: string;
  colour: string;
  thesis?: string;
  drivers?: string[];
  risks?: string[];
  ratings?: Record<string, string>;
  companies?: Array<{ ticker: string; name: string; sector: string }>;
  pending_proposal_id?: number;
}

interface AgentPanelProps {
  agent: AgentDetail | null;
  onReviewProposal: () => void;
  onRefreshAgent: () => void;
}

const ratingColor: Record<string, string> = {
  BUY: 'text-emerald-600 bg-emerald-50',
  NEUTRAL: 'text-gray-600 bg-gray-100',
  SELL: 'text-red-600 bg-red-50',
};

export default function AgentPanel({ agent, onReviewProposal, onRefreshAgent }: AgentPanelProps) {
  if (!agent) {
    return (
      <div className="w-[340px] bg-white border-l border-gray-200 flex items-center justify-center h-full">
        <p className="text-gray-400 text-sm font-mono">Select an agent</p>
      </div>
    );
  }

  return (
    <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-mono font-bold text-gray-900">{agent.agent_name}</h2>
          <p className="text-xs text-gray-400">{agent.sector_name}</p>
        </div>
        <button
          onClick={onRefreshAgent}
          className="text-gray-400 hover:text-gray-600 text-lg"
          title="Refresh"
        >↻</button>
      </div>

      {/* Pending proposal banner */}
      {agent.pending_proposal_id && (
        <button
          onClick={onReviewProposal}
          className="mx-3 mt-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-left"
        >
          <p className="text-sm font-mono font-semibold text-orange-700">⚠ Review Proposal</p>
          <p className="text-xs text-orange-500 mt-0.5">Agent has proposed brief updates</p>
        </button>
      )}

      {/* Brief */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Thesis */}
        <div>
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Thesis</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {agent.thesis || <span className="text-gray-400 italic">No thesis published yet</span>}
          </p>
        </div>

        {/* Drivers */}
        {agent.drivers && agent.drivers.length > 0 && (
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Key Drivers</p>
            <ul className="space-y-1">
              {agent.drivers.map((d, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                  <span className="text-emerald-500 font-bold flex-shrink-0">+</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {agent.risks && agent.risks.length > 0 && (
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Key Risks</p>
            <ul className="space-y-1">
              {agent.risks.map((r, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                  <span className="text-red-500 font-bold flex-shrink-0">−</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ratings */}
        {agent.ratings && Object.keys(agent.ratings).length > 0 && (
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Ratings</p>
            <div className="space-y-1">
              {Object.entries(agent.ratings).map(([ticker, rating]) => (
                <div key={ticker} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-gray-700">{ticker}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${ratingColor[rating] || 'text-gray-500 bg-gray-50'}`}>
                    {rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage list */}
        {agent.companies && agent.companies.length > 0 && (
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Coverage ({agent.companies.length})</p>
            <div className="space-y-1">
              {agent.companies.map((c) => {
                const rating = agent.ratings?.[c.ticker];
                return (
                  <div key={c.ticker} className="flex items-center justify-between py-1 border-b border-gray-50">
                    <div>
                      <span className="text-xs font-mono font-semibold text-gray-700">{c.ticker}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{c.name}</span>
                    </div>
                    {rating && (
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${ratingColor[rating] || ''}`}>
                        {rating}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
