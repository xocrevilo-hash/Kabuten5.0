'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

interface AgentAttribution {
  key: string;
  name: string;
  sector: string;
}

interface AskResponse {
  answer: string;
  agents_consulted: AgentAttribution[];
  question: string;
}

export default function NavBar() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const links = [
    { label: 'Coverage', href: '/' },
    { label: 'Sectors', href: '/sectors' },
    { label: 'Heatmap', href: '/heatmap' },
    { label: 'Podcasts', href: '/podcasts' },
    { label: 'Help', href: '/help' },
  ];

  useEffect(() => {
    if (modalOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [modalOpen]);

  const openModal = () => {
    setModalOpen(true);
    setResponse(null);
    setError('');
    setQuestion('');
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/ask-kabuten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const EXAMPLE_QUESTIONS = [
    'Which sectors are most exposed to US tariffs?',
    'What is the outlook for HBM memory?',
    'Where do you see the most upside in AI semis?',
    'Compare TSMC and Samsung on capex trajectory',
  ];

  return (
    <>
      <nav className="nav-bar">
        {/* Left: Wordmark */}
        <Link href="/" className="nav-wordmark" style={{ textDecoration: 'none', marginRight: 'auto' }}>
          KABUTEN
        </Link>

        {/* Right: Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={openModal}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              backgroundColor: '#0f0f0e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '5px',
              padding: '5px 14px',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.8'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
          >
            Ask Kabuten
          </button>
        </div>
      </nav>

      {/* Ask Kabuten modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={closeModal}
        >
          <div
            className="content-box"
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '2rem',
              margin: '0 auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.06em',
                color: '#0f0f0e',
              }}>
                ASK KABUTEN
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9b9b97',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  padding: '2px 6px',
                }}
              >
                ×
              </button>
            </div>

            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.8125rem',
              color: '#6b6b67',
              marginBottom: '1.25rem',
              lineHeight: 1.5,
            }}>
              Cross-sector synthesis from all 20 analyst agents. Kabuten routes your question to
              the relevant agents and returns a synthesised answer with attribution.
            </p>

            {/* Input */}
            <div style={{ marginBottom: '0.75rem' }}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything across all sectors..."
                rows={3}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.875rem',
                  color: '#0f0f0e',
                  padding: '0.75rem',
                  border: '1px solid #e0e0da',
                  borderRadius: '6px',
                  backgroundColor: '#fafaf8',
                  outline: 'none',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{
                fontSize: '0.6875rem',
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#b0b0aa',
                marginTop: '0.25rem',
              }}>
                Enter to send · Shift+Enter for newline
              </p>
            </div>

            {/* Example questions */}
            {!response && !loading && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{
                  fontSize: '0.6875rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: '#b0b0aa',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Example questions
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {EXAMPLE_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.75rem',
                        color: '#4b5563',
                        backgroundColor: '#f3f3ef',
                        border: '1px solid #e5e5e0',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || loading}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backgroundColor: !question.trim() || loading ? '#d0d0cc' : '#0f0f0e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 20px',
                cursor: !question.trim() || loading ? 'not-allowed' : 'pointer',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Synthesising...
                </>
              ) : 'Ask'}
            </button>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '0.875rem',
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Response */}
            {response && (
              <div style={{
                borderTop: '1px solid #ebebea',
                paddingTop: '1.25rem',
              }}>
                {/* Agents consulted */}
                {response.agents_consulted.length > 0 && (
                  <div style={{ marginBottom: '0.875rem' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: '#b0b0aa',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Agents consulted:{' '}
                    </span>
                    {response.agents_consulted.map((a, i) => (
                      <span key={a.key} style={{
                        fontSize: '0.6875rem',
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: '#4b5563',
                        fontWeight: 600,
                      }}>
                        {a.name}{i < response.agents_consulted.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Answer */}
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                }}>
                  {response.answer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
