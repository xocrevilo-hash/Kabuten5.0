'use client';
import { useState } from 'react';

interface Finding {
  company_ticker: string;
  classification: string;
  headline: string;
  detail?: string;
  catalyst_update?: string;
  earnings_summary?: string;
}

interface Signal {
  signal: string;
}

interface SweepCardProps {
  date: string;
  findings: Finding[];
  signals: Signal[];
  agentName: string;
}

const classIcon: Record<string, string> = {
  Material: '🔴',
  Incremental: '🟡',
  'No Change': '⚪',
};

export default function SweepCard({ date, findings, signals, agentName }: SweepCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const material = findings.filter(f => f.classification === 'Material').length;
  const incremental = findings.filter(f => f.classification === 'Incremental').length;
  const noChange = findings.filter(f => f.classification === 'No Change').length;

  return (
    <div className="border border-gray-200 rounded-lg bg-white/90 overflow-hidden my-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">↻</span>
        <div className="flex-1">
          <span className="text-sm font-mono font-semibold text-gray-700">Daily Sweep — {date}</span>
          <div className="flex gap-3 mt-1 text-xs font-mono text-gray-500">
            <span>{material} 🔴 Material</span>
            <span>{incremental} 🟡 Incremental</span>
            <span>{noChange} ⚪ No Change</span>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {/* Findings */}
          {findings.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Findings</p>
              <div className="space-y-2">
                {findings.map((f, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="flex-shrink-0 w-5">{classIcon[f.classification] || '⚪'}</span>
                    <span className="font-mono font-semibold text-gray-700 w-20 flex-shrink-0">{f.company_ticker}</span>
                    <span className="text-gray-600">{f.headline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-company signals */}
          {signals.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Cross-Company Signals</p>
              <div className="space-y-1">
                {signals.map((s, i) => (
                  <p key={i} className="text-sm text-gray-600">• {s.signal}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
