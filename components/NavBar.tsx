'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function NavBar() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  const links = [
    { label: 'Coverage', href: '/' },
    { label: 'Sectors', href: '/sectors' },
    { label: 'Heatmap', href: '/heatmap' },
    { label: 'Podcasts', href: '/podcasts' },
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
            onClick={() => setModalOpen(true)}
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
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.opacity = '0.8';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Ask Kabuten
          </button>
        </div>
      </nav>

      {/* Ask Kabuten modal placeholder */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="content-box"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              margin: '1rem',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.04em',
                marginBottom: '1rem',
                color: '#0f0f0e',
              }}
            >
              ASK KABUTEN
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.875rem',
                color: '#6b6b67',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              Natural language query interface — coming in Phase 2.
            </p>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                fontWeight: 700,
                backgroundColor: '#0f0f0e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
