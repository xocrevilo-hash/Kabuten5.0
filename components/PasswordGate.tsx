'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [shaking, setShaking] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('kabuten_auth');
    if (stored === 'true') {
      setAuthenticated(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!authenticated && hydrated) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [authenticated, hydrated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'fingerthumb') {
      sessionStorage.setItem('kabuten_auth', 'true');
      setAuthenticated(true);
    } else {
      setError('Incorrect password');
      setShaking(true);
      setPassword('');
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(''), 2000);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        ref={formRef}
        className={shaking ? 'shake' : ''}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          width: '100%',
          maxWidth: '320px',
          padding: '0 1.5rem',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
            fontWeight: 800,
            fontSize: '2.5rem',
            letterSpacing: '-0.02em',
            color: '#0f0f0e',
            textShadow: `
              1px 1px 0 #3a2a0a,
              2px 2px 0 #3a2a0a,
              3px 3px 0 #4a3410,
              4px 4px 0 #4a3410,
              5px 5px 0 #5a3e16,
              6px 6px 0 #5a3e16,
              7px 7px 0 #6a481c,
              8px 8px 0 #6a481c,
              9px 9px 0 #7a5222,
              10px 10px 0 #7a5222
            `,
            userSelect: 'none',
            marginBottom: '0.5rem',
          }}
        >
          KABUTEN
        </div>

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            fontWeight: 500,
            letterSpacing: '0.14em',
            color: '#9b9b97',
            textTransform: 'uppercase',
            marginTop: '-1.5rem',
          }}
        >
          AI Equity Research
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
          }}
        >
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.875rem',
              border: '1.5px solid #e2e2e0',
              borderRadius: '6px',
              outline: 'none',
              color: '#0f0f0e',
              backgroundColor: '#ffffff',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#0f0f0e';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e2e2e0';
            }}
          />

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              backgroundColor: '#0f0f0e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.opacity = '0.85';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Enter
          </button>
        </form>

        {/* Error message */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            color: '#dc2626',
            height: '1rem',
            transition: 'opacity 0.2s ease',
            opacity: error ? 1 : 0,
            marginTop: '-0.75rem',
          }}
        >
          {error || ' '}
        </div>
      </div>
    </div>
  );
}
