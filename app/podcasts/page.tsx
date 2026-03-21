'use client';

import { useState, useEffect, useRef } from 'react';

const TRACKED_PODCASTS = [
  'A16Z Show',
  'All-In',
  'BG2 Pod',
  'Big Technology Podcast',
  'Bloomberg Tech',
  'Hard Fork',
  'No Priors',
  'Odd Lots',
  'Semi-Doped',
  'The Circuit',
];

interface BulletItem {
  text: string;
  tag: string;
}

interface PodcastSummary {
  id: number;
  podcast_name: string;
  episode_title: string;
  episode_date: string | null;
  bullets: (string | BulletItem)[];
  tickers: string[] | null;
  source_url: string | null;
  has_relevant_content: boolean;
  created_at: string;
  scanned_at: string;
}

interface LogLine {
  text: string;
  type: 'scanning' | 'ok' | 'error' | 'skip' | 'done';
}

function formatEpisodeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff3cc', color: 'inherit', padding: 0 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {highlight(text.slice(idx + query.length), query)}
    </>
  );
}

function matchesSummary(s: PodcastSummary, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (s.podcast_name.toLowerCase().includes(q)) return true;
  if (s.episode_title.toLowerCase().includes(q)) return true;
  if (s.tickers?.some(t => t.toLowerCase().includes(q))) return true;
  for (const b of s.bullets) {
    const text = typeof b === 'string' ? b : b.text;
    if (text.toLowerCase().includes(q)) return true;
  }
  return false;
}

export default function PodcastsPage() {
  const [summaries, setSummaries] = useState<PodcastSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummaries = async () => {
    try {
      const res = await fetch('/api/podcasts');
      if (res.ok) {
        const { summaries } = await res.json();
        setSummaries(Array.isArray(summaries) ? summaries : []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchSummaries().finally(() => setLoadingData(false));
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleRunScanner = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanComplete(false);
    setLogLines([{ text: '⟳ Starting scanner…', type: 'scanning' }]);

    try {
      for (const show of TRACKED_PODCASTS) {
        setLogLines(prev => [...prev, { text: `⟳ Scanning ${show}…`, type: 'scanning' }]);
        try {
          const res = await fetch('/api/podcasts/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.error) {
            setLogLines(prev => [...prev, { text: `✗ ${show}: ${data.error || 'failed'}`, type: 'error' }]);
          } else if (!data.hasRelevantContent) {
            setLogLines(prev => [...prev, { text: `○ ${show}: no relevant content`, type: 'skip' }]);
          } else {
            setLogLines(prev => [...prev, { text: `✓ ${show}`, type: 'ok' }]);
          }
        } catch (e) {
          setLogLines(prev => [...prev, { text: `✗ ${show}: ${String(e)}`, type: 'error' }]);
        }
      }

      const r = await fetch('/api/podcasts');
      const { summaries } = await r.json();
      setSummaries(summaries);
      setLogLines(prev => [...prev, { text: 'Done.', type: 'done' }]);
      setScanComplete(true);
    } catch (err) {
      setLogLines(prev => [...prev, { text: `✗ Network error: ${String(err)}`, type: 'error' }]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilterClick = (name: string) => {
    setActiveFilter(prev => (prev === name ? null : name));
  };

  const filtered = activeFilter
    ? summaries.filter(s => s.podcast_name === activeFilter)
    : summaries;

  const displayed = searchQuery
    ? filtered.filter(s => matchesSummary(s, searchQuery))
    : filtered;

  const logColor: Record<LogLine['type'], string> = {
    scanning: '#9b9b97',
    ok: '#22a06b',
    error: '#e53e3e',
    skip: '#6b6b67',
    done: '#C5993A',
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', padding: '1.5rem', gap: '1.5rem', fontFamily: 'Arial, sans-serif' }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: '210px', flexShrink: 0 }}>
        <div className="content-box" style={{ position: 'sticky', top: '72px', overflow: 'hidden' }}>
          {/* Sidebar header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #e2e2e0',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9b9b97',
          }}>
            Podcasts Tracked
          </div>

          {/* Podcast list */}
          {TRACKED_PODCASTS.map(name => {
            const isActive = activeFilter === name;
            return (
              <button
                key={name}
                onClick={() => handleFilterClick(name)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 14px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11.5px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#0f0f0e' : '#4b4b47',
                  background: isActive ? 'rgba(197, 153, 58, 0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid #C5993A' : '2px solid transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: '1px solid #f0f0ee',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {name}
              </button>
            );
          })}

          {/* Scanner log */}
          {logLines.length > 0 && (
            <div
              ref={logRef}
              style={{
                background: '#111',
                borderTop: '1px solid #222',
                padding: '10px 12px',
                maxHeight: '220px',
                overflowY: 'auto',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                lineHeight: 1.7,
              }}
            >
              {logLines.map((line, i) => (
                <div key={i} style={{ color: logColor[line.type] }}>
                  {line.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right feed ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#0f0f0e',
              margin: 0,
              lineHeight: 1.2,
            }}>
              Podcasts
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: '#9b9b97',
              margin: '4px 0 0',
            }}>
              AI-generated investment summaries — 10 shows tracked
            </p>
          </div>

          {/* Scanner button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button
              onClick={handleRunScanner}
              disabled={isScanning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.6px',
                padding: '7px 14px',
                borderRadius: '5px',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s ease',
                ...(isScanning
                  ? {
                      backgroundColor: 'transparent',
                      color: '#C5993A',
                      border: '1.5px solid #C5993A',
                    }
                  : {
                      backgroundColor: '#C5993A',
                      color: '#ffffff',
                      border: '1.5px solid #C5993A',
                    }),
              }}
            >
              <span style={{
                display: 'inline-block',
                fontSize: '13px',
                ...(isScanning ? {
                  animation: 'spin 0.7s linear infinite',
                } : {}),
              }}>
                ⟳
              </span>
              {isScanning ? 'Scanning…' : 'Run Scanner'}
            </button>
            {scanComplete && !isScanning && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                color: '#22a06b',
              }}>
                ✓ Scan complete
              </span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ width: '75%', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search episodes, tickers, topics…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                padding: '8px 36px 8px 12px',
                border: '1px solid #d0d0ce',
                borderRadius: '4px',
                outline: 'none',
                color: '#0f0f0e',
                background: '#fff',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#9b9b97',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              color: '#9b9b97',
              marginTop: '5px',
            }}>
              {displayed.length} {displayed.length === 1 ? 'episode' : 'episodes'}
            </div>
          )}
        </div>

        {/* Feed */}
        {loadingData ? (
          <div className="content-box" style={{ padding: '3rem', textAlign: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#9b9b97' }}>
              Loading summaries…
            </span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="content-box" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#9b9b97', margin: 0 }}>
              {searchQuery
                ? `No episodes matching "${searchQuery}".`
                : activeFilter
                  ? `No summaries for ${activeFilter}.`
                  : 'No podcast summaries yet.'}
            </p>
            {!activeFilter && !searchQuery && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#b0b0aa', margin: '6px 0 0' }}>
                Run the scanner to fetch the latest episodes.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayed.map(s => (
              <EpisodeCard key={s.id} summary={s} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TAG_STYLES: Record<string, { color: string; borderColor: string; background: string }> = {
  AI:      { color: '#1a5fa8', borderColor: '#b3d0ef', background: '#eef5fc' },
  SEMIS:   { color: '#6b3fa0', borderColor: '#d4b8f0', background: '#f5eefe' },
  MACRO:   { color: '#1a7a50', borderColor: '#a3d9c0', background: '#edf8f3' },
  CLOUD:   { color: '#a05c10', borderColor: '#f0d09a', background: '#fdf5e6' },
  EV:      { color: '#a02020', borderColor: '#f0b0b0', background: '#fdeaea' },
  DEFENCE: { color: '#555555', borderColor: '#cccccc', background: '#f5f5f5' },
  OTHER:   { color: '#555555', borderColor: '#cccccc', background: '#f5f5f5' },
};

function TagPill({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag] ?? TAG_STYLES['OTHER'];
  return (
    <span style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      letterSpacing: '0.09em',
      width: '54px',
      boxSizing: 'border-box',
      textAlign: 'center',
      padding: '2px 0',
      border: `1px solid ${style.borderColor}`,
      borderRadius: 0,
      color: style.color,
      background: style.background,
      display: 'inline-block',
      lineHeight: 1.4,
      flexShrink: 0,
      marginTop: '5px',
    }}>
      {tag}
    </span>
  );
}

function EpisodeCard({ summary: s, searchQuery = '' }: { summary: PodcastSummary; searchQuery?: string }) {
  const tickers = s.tickers ?? [];
  const bullets = s.bullets ?? [];

  return (
    <div className="content-box" style={{ padding: '16px 20px', width: '75%' }}>
      {/* Meta row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        fontWeight: 600,
        color: '#9b9b97',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '6px',
      }}>
        <span style={{ color: '#6b6b67' }}>{s.podcast_name}</span>
        <span>·</span>
        <span>{formatEpisodeDate(s.episode_date)}</span>
        {s.source_url && (
          <>
            <span>·</span>
            <a
              href={s.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#C5993A', textDecoration: 'none' }}
            >
              source ↗
            </a>
          </>
        )}
      </div>

      {/* Episode title */}
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '14.5px',
        fontWeight: 600,
        color: '#0f0f0e',
        marginBottom: '10px',
        lineHeight: 1.35,
      }}>
        {highlight(s.episode_title, searchQuery)}
      </div>

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul style={{
          margin: '0 0 12px',
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          {bullets.map((b, i) => {
            if (typeof b === 'string') {
              return (
                <li key={i} style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '18px',
                  color: '#2d2d2b',
                  lineHeight: 1.55,
                  paddingLeft: '14px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0, color: '#9b9b97' }}>•</span>
                  {highlight(b, searchQuery)}
                </li>
              );
            }
            return (
              <li key={i} style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: '#2d2d2b',
                lineHeight: 1.55,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
              }}>
                <TagPill tag={b.tag} />
                <span style={{ color: '#9b9b97', flexShrink: 0 }}>·</span>
                <span>{highlight(b.text, searchQuery)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Tickers */}
      {tickers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#9b9b97',
            marginRight: '2px',
          }}>
            Coverage:
          </span>
          {tickers.map(t => (
            <span key={t} style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              color: '#4b4b47',
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '3px',
              padding: '2px 6px',
            }}>
              {highlight(t, searchQuery)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
