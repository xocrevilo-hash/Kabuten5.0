'use client';

import { useState, useEffect } from 'react';

const TRACKED_PODCASTS = [
  'Acquired',
  'All-In Podcast',
  'Asianometry',
  'BG2 Pod',
  'Bloomberg Odd Lots',
  'Invest Like the Best',
  'Macro Voices',
  'Readout Loud (STAT News)',
  'Semiconductor Insiders',
  'The Circuit with Emily Chang',
  'We Study Billionaires',
];

interface PodcastSummary {
  id: number;
  podcast_name: string;
  episode_title: string | null;
  summary: string | null;
  companies_mentioned: string[] | null;
  published_at: string | null;
  created_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PodcastsPage() {
  const [summaries, setSummaries] = useState<PodcastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/podcasts')
      .then((r) => r.json())
      .then((data) => {
        setSummaries(data.summaries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-mono text-2xl font-bold text-gray-900 tracking-tight">
            Podcasts
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            AI-generated investment summaries — {TRACKED_PODCASTS.length} shows tracked
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left column: Podcasts Tracked reference table */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-mono text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Podcasts Tracked
                </h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {TRACKED_PODCASTS.map((name) => (
                  <li key={name} className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-700">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right column: Summaries list */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="font-mono text-sm text-gray-400">Loading summaries...</p>
              </div>
            ) : summaries.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="font-mono text-sm text-gray-400">No podcast summaries yet.</p>
                <p className="font-mono text-xs text-gray-400 mt-2">
                  Summaries will appear here as episodes are processed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((s) => {
                  const isExpanded = expanded.has(s.id);
                  const companies = s.companies_mentioned || [];

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {/* Header */}
                      <div
                        className="px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        onClick={() => toggleExpanded(s.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {/* Podcast name pill */}
                              <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 flex-shrink-0">
                                {s.podcast_name}
                              </span>
                              <span className="text-xs font-mono text-gray-400">
                                {formatDate(s.published_at || s.created_at)}
                              </span>
                            </div>
                            {s.episode_title && (
                              <p className="font-mono text-sm font-medium text-gray-900 truncate">
                                {s.episode_title}
                              </p>
                            )}
                          </div>
                          <span className="text-gray-400 text-sm flex-shrink-0 mt-0.5">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>

                        {/* Companies mentioned (always visible) */}
                        {companies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {companies.map((c) => (
                              <span
                                key={c}
                                className="inline-block px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-mono text-blue-700"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded summary */}
                      {isExpanded && s.summary && (
                        <div className="px-5 pb-5 border-t border-gray-100">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-4 font-sans">
                            {s.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
