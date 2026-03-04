'use client';
import { useState } from 'react';

interface Proposal {
  id: number;
  agent_key: string;
  proposed_thesis?: string;
  proposed_drivers?: string[];
  proposed_risks?: string[];
  proposed_ratings?: Record<string, string>;
  reasoning?: string;
  proposed_at: string;
}

interface CurrentBrief {
  thesis?: string;
  drivers?: string[];
  risks?: string[];
  ratings?: Record<string, string>;
}

interface BriefProposalProps {
  proposal: Proposal;
  currentBrief: CurrentBrief;
  agentName: string;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export default function BriefProposal({ proposal, currentBrief, agentName, onClose, onAccept, onReject }: BriefProposalProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await onAccept();
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-mono font-bold text-lg">{agentName} — Brief Proposal</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Proposed {new Date(proposal.proposed_at).toLocaleDateString('en-US', { 
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Reasoning */}
          {proposal.reasoning && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">Agent Reasoning</p>
              <p className="text-sm text-amber-900">{proposal.reasoning}</p>
            </div>
          )}

          {/* Thesis diff */}
          {proposal.proposed_thesis && proposal.proposed_thesis !== currentBrief.thesis && (
            <div>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Thesis Change</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-100 rounded p-2">
                  <p className="text-xs text-red-400 mb-1 font-mono">CURRENT</p>
                  <p className="text-sm text-red-900">{currentBrief.thesis || 'No thesis'}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded p-2">
                  <p className="text-xs text-emerald-400 mb-1 font-mono">PROPOSED</p>
                  <p className="text-sm text-emerald-900">{proposal.proposed_thesis}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ratings diff */}
          {proposal.proposed_ratings && (
            <div>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Rating Changes</p>
              <div className="space-y-1">
                {Object.entries(proposal.proposed_ratings).map(([ticker, newRating]) => {
                  const oldRating = currentBrief.ratings?.[ticker];
                  const changed = oldRating !== newRating;
                  return (
                    <div key={ticker} className={`flex items-center gap-3 px-2 py-1.5 rounded ${changed ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      <span className="font-mono text-sm font-semibold w-20">{ticker}</span>
                      {changed ? (
                        <>
                          <span className="text-sm text-red-500 line-through">{oldRating || '—'}</span>
                          <span className="text-sm">→</span>
                          <span className="text-sm text-emerald-600 font-semibold">{newRating}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">{newRating} (unchanged)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white font-mono font-semibold py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            ✓ Accept
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 bg-red-50 text-red-600 font-mono font-semibold py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
          >
            ✗ Reject
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 bg-gray-100 text-gray-600 font-mono py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
