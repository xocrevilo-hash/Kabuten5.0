'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import KabutenLogo from '@/components/KabutenLogo';

// Kanji wallpaper as inline SVG data-URI so it shows on the gate page
// without relying on the ::before pseudo-element used on authenticated pages.
// 160×160 tile, 株 top-left / 天 bottom-right, 52px serif, rgba(0,0,0,0.06)
const KANJI_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E" +
  "%3Ctext x='8' y='72' font-family='serif' font-size='52' fill='rgba(0,0,0,0.06)'%3E%E6%A0%AA%3C/text%3E" +
  "%3Ctext x='88' y='148' font-family='serif' font-size='52' fill='rgba(0,0,0,0.06)'%3E%E5%A4%A9%3C/text%3E" +
  "%3C/svg%3E\")";

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

  useEffect(() => {
    const stored = sessionStorage.getItem('kabuten_auth');
    if (stored === 'true') setAuthenticated(true);
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

  if (!hydrated) return null;
  if (authenticated) return <>{children}</>;

  return (
    /* Full-screen wallpaper backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#FAFAF8',
        backgroundImage: KANJI_BG,
        backgroundRepeat: 'repeat',
        backgroundSize: '160px 160px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      {/* Card — logo + form, centred */}
      <div
        className={shaking ? 'shake' : ''}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.75rem',
        }}
      >
        {/* Animated shimmer wordmark */}
        <KabutenLogo size="gate" />

        {/* Password form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center',
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
              width: '280px',
              padding: '10px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.875rem',
              textAlign: 'center',
              border: '1.5px solid #d4d4d0',
              borderRadius: '6px',
              outline: 'none',
              color: '#0f0f0e',
              backgroundColor: 'rgba(255,255,255,0.85)',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => { e.target.style.borderColor = '#0f0f0e'; }}
            onBlur={e  => { e.target.style.borderColor = '#d4d4d0'; }}
          />

          <button
            type="submit"
            style={{
              width: '280px',
              padding: '10px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              backgroundColor: '#0f0f0e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.82'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
          >
            Enter
          </button>
        </form>

        {/* Error */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            color: '#dc2626',
            height: '1rem',
            marginTop: '-0.75rem',
            opacity: error ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {error || ' '}
        </div>
      </div>
    </div>
  );
}
