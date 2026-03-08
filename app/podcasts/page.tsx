'use client';

import { useState, useEffect, useRef } from 'react';

const CRON_SECRET = '2d59c82e3b6784db3860d64d14474c22cfcdac916c64d4029fee41e88cc807cd';

const TRACKED_PODCASTS = [
  'A16Z Show',
  'All-In',
  'BG2 Pod',
  'Big Technology Podcast',
  'Bloomberg Tech',
  'Hard Fork',
  'Odd Lots',
  'Semi-Doped',
  'The Circuit',
];

interface PodcastSummary {
  id: number;
  podcast_name: string;
  episode_title: string;
  episode_date: string | null;
  bullets: string[];
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

export default function PodcastsPage() {
  const [summaries, setSummaries] = useState<PodcastSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummaries = async () => {
    try {
      const res = await fetch('/api/podcasts');
      if (res.ok) {
        const data = await res.json();
        setSummaries(Array.isArray(data) ? data : []);
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

    // Start polling every 5s while scanning
    pollRef.current = setInterval(fetchSummaries, 5000);

    try {
      const res = await fetch('/api/podcasts/scan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-cron-secret': CRON_SECRET },
      });

      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }));
        setLogLines(prev => [
          ...prev,
          { text: `✗ Error: ${err.error || 'Scan failed'}`, type: 'error' },
        ]);
        setIsScanning(false);
        return;
      }

      const data = await res.json();
      const newLines: LogLine[] = [];

      if (data.results) {
        for (const r of data.results) {
          if (r.error) {
            newLines.push({ text: `✗ ${r.podcast}: ${r.error}`, type: 'error' });
          } else if (!r.hasRelevantContent) {
            newLines.push({ text: `○ ${r.podcast}: no relevant content`, type: 'skip' });
          } else {
            newLines.push({ text: `✓ ${r.podcast}`, type: 'ok' });
          }
        }
      }

      newLines.push({
        text: `Done — ${data.withContent ?? 0}/${data.scanned ?? TRACKED_PODCASTS.length} episodes with relevant content`,
        type: 'done',
      });

      setLogLines(prev => [...prev, ...newLines]);
      setScanComplete(true);
      await fetchSummaries();
    } catch (err) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setLogLines(prev => [
        ...prev,
        { text: `✗ Network error: ${String(err)}`, type: 'error' },
      ]);
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

  const logColor: Record<LogLine['type'], string> = {
    scanning: '#9b9b97',
    ok: '#22a06b',
    error: '#e53e3e',
    skip: '#6b6b67',
    done: '#C5993A',
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', padding: '1.5rem', gap: '1.5rem' }}>

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
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
              AI-generated investment summaries — 9 shows tracked
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

        {/* Feed */}
        {loadingData ? (
          <div className="content-box" style={{ padding: '3rem', textAlign: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#9b9b97' }}>
              Loading summaries…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="content-box" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#9b9b97', margin: 0 }}>
              {activeFilter ? `No summaries for ${activeFilter}.` : 'No podcast summaries yet.'}
            </p>
            {!activeFilter && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#b0b0aa', margin: '6px 0 0' }}>
                Run the scanner to fetch the latest episodes.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(s => (
              <EpisodeCard key={s.id} summary={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeCard({ summary: s }: { summary: PodcastSummary }) {
  const tickers = s.tickers ?? [];
  const bullets = s.bullets ?? [];

  return (
    <div className="content-box" style={{ padding: '16px 20px' }}>
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
        {s.episode_title}
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
          {bullets.map((b, i) => (
            <li key={i} style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#2d2d2b',
              lineHeight: 1.55,
              paddingLeft: '14px',
              position: 'relative',
            }}>
              <span style={{ position: 'absolute', left: 0, color: '#9b9b97' }}>•</span>
              {b}
            </li>
          ))}
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
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
